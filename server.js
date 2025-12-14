const express = require('express');
const crypto = require('crypto');

// Cyclic.sh Storage (Persistent!)
const CyclicDB = require("@cyclic.sh/s3fs");
const s3fs = new CyclicDB(process.env.CYCLIC_BUCKET_NAME);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════
const CONFIG = {
    SCRIPT_NAME: process.env.SCRIPT_NAME || 'My Roblox Script',
    KEY_EXPIRY_HOURS: parseInt(process.env.KEY_EXPIRY_HOURS) || 24,
    LOOTLABS_LINK: process.env.LOOTLABS_LINK || 'https://loot-link.com/s?YOUR_LINK',
    ADMIN_KEY: process.env.ADMIN_KEY || 'admin123',
    DISCORD_LINK: process.env.DISCORD_LINK || 'https://discord.gg/yourserver'
};

// ══════════════════════════════════════════════════════════
// DATABASE FUNCTIONS (Persistent Storage)
// ══════════════════════════════════════════════════════════
const KEYS_FILE = 'keys.json';

async function loadKeys() {
    try {
        const data = await s3fs.readFile(KEYS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

async function saveKeys(keys) {
    try {
        await s3fs.writeFile(KEYS_FILE, JSON.stringify(keys, null, 2));
    } catch (e) {
        console.error('Error saving keys:', e);
    }
}

// ══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════
function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = 'KEY';
    for (let i = 0; i < 3; i++) {
        key += '-';
        for (let j = 0; j < 4; j++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    return key;
}

function formatTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// Clean expired keys
async function cleanExpiredKeys() {
    const keys = await loadKeys();
    const now = Date.now();
    let cleaned = 0;
    
    for (const key in keys) {
        if (now > keys[key].expiresAt) {
            delete keys[key];
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        await saveKeys(keys);
        console.log(`🧹 Cleaned ${cleaned} expired keys`);
    }
}

// ══════════════════════════════════════════════════════════
// HTML TEMPLATES
// ══════════════════════════════════════════════════════════
const styles = `
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.05);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            width: 100%;
            border: 1px solid rgba(255,255,255,0.1);
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .logo { font-size: 50px; margin-bottom: 15px; }
        h1 {
            font-size: 2rem;
            margin-bottom: 8px;
            background: linear-gradient(90deg, #e94560, #ff6b6b);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .subtitle { color: #888; margin-bottom: 30px; font-size: 14px; }
        .btn {
            display: inline-block;
            padding: 15px 40px;
            font-size: 16px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 12px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 8px;
        }
        .btn-primary {
            background: linear-gradient(90deg, #e94560, #ff6b6b);
            color: white;
        }
        .btn-secondary {
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-success {
            background: linear-gradient(90deg, #10b981, #34d399);
            color: white;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(233, 69, 96, 0.3);
        }
        .key-box {
            background: #1a1a2e;
            border: 2px solid #e94560;
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            font-family: 'Courier New', monospace;
            font-size: 1.2rem;
            font-weight: 700;
            letter-spacing: 2px;
            color: #fff;
            word-break: break-all;
            user-select: all;
        }
        .info-box {
            background: rgba(16, 185, 129, 0.1);
            border: 1px solid rgba(16, 185, 129, 0.3);
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            font-size: 14px;
            color: #34d399;
        }
        .warning-box {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
            font-size: 13px;
            color: #fbbf24;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        .stat-item { text-align: center; }
        .stat-value { 
            font-size: 24px; 
            font-weight: 700; 
            color: #e94560; 
        }
        .stat-label { font-size: 12px; color: #888; }
        .expire-text { color: #888; font-size: 14px; margin-top: 15px; }
    </style>
`;

// ══════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════

// Homepage
app.get('/', async (req, res) => {
    const keys = await loadKeys();
    const totalKeys = Object.keys(keys).length;
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.SCRIPT_NAME} - Key System</title>
    ${styles}
</head>
<body>
    <div class="container">
        <div class="logo">🔐</div>
        <h1>${CONFIG.SCRIPT_NAME}</h1>
        <p class="subtitle">Premium Key System</p>
        
        <a href="/getkey" class="btn btn-primary">🔑 Get Your Key</a>
        <a href="${CONFIG.DISCORD_LINK}" target="_blank" class="btn btn-secondary">💬 Discord</a>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value">${totalKeys}</div>
                <div class="stat-label">Active Keys</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${CONFIG.KEY_EXPIRY_HOURS}h</div>
                <div class="stat-label">Key Duration</div>
            </div>
        </div>
        
        <div class="warning-box">
            ⚠️ Each key can only be used on ONE device
        </div>
    </div>
</body>
</html>
    `);
});

// Redirect ke LootLabs
app.get('/getkey', (req, res) => {
    if (CONFIG.LOOTLABS_LINK.includes('YOUR_LINK')) {
        // Demo mode - langsung generate key
        res.redirect('/api/callback?demo=true');
    } else {
        res.redirect(CONFIG.LOOTLABS_LINK);
    }
});

// LootLabs Callback (GET)
app.get('/api/callback', async (req, res) => {
    await handleCallback(req, res);
});

// LootLabs Callback (POST)
app.post('/api/callback', async (req, res) => {
    await handleCallback(req, res);
});

// Handle Callback
async function handleCallback(req, res) {
    try {
        // Clean expired keys first
        await cleanExpiredKeys();
        
        // Generate new key
        const keys = await loadKeys();
        const newKey = generateKey();
        const expiryMs = CONFIG.KEY_EXPIRY_HOURS * 60 * 60 * 1000;
        
        keys[newKey] = {
            createdAt: Date.now(),
            expiresAt: Date.now() + expiryMs,
            hwid: null,
            uses: 0,
            createdBy: req.query.user_id || 'lootlabs'
        };
        
        await saveKeys(keys);
        console.log('✅ New key generated:', newKey);
        
        res.redirect(`/success?key=${encodeURIComponent(newKey)}`);
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).send('Error generating key');
    }
}

// Success Page
app.get('/success', (req, res) => {
    const key = req.query.key || 'ERROR';
    
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Key Generated! ✅</title>
    ${styles}
</head>
<body>
    <div class="container">
        <div class="logo">🎉</div>
        <h1>Key Generated!</h1>
        <p class="subtitle">Your key is ready to use</p>
        
        <div class="key-box" id="keyText">${key}</div>
        
        <button class="btn btn-success" onclick="copyKey()">📋 Copy Key</button>
        <a href="/" class="btn btn-secondary">🏠 Home</a>
        
        <div class="info-box">
            <strong>📝 How to use:</strong><br>
            1. Copy the key above<br>
            2. Open your Roblox executor<br>
            3. Run the script<br>
            4. Paste the key when prompted
        </div>
        
        <p class="expire-text">⏰ Key expires in ${CONFIG.KEY_EXPIRY_HOURS} hours</p>
    </div>
    
    <script>
        function copyKey() {
            const key = document.getElementById('keyText').innerText;
            navigator.clipboard.writeText(key).then(() => {
                const btn = document.querySelector('.btn-success');
                const originalText = btn.innerHTML;
                btn.innerHTML = '✅ Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            });
        }
    </script>
</body>
</html>
    `);
});

// ══════════════════════════════════════════════════════════
// API ENDPOINTS
// ══════════════════════════════════════════════════════════

// Validate Key (untuk Roblox Script)
app.post('/api/validate', async (req, res) => {
    try {
        const { key, hwid } = req.body;
        
        console.log('🔍 Validation request:', { key: key?.substring(0, 10) + '...', hwid: hwid?.substring(0, 10) + '...' });
        
        if (!key) {
            return res.json({ valid: false, message: 'No key provided' });
        }
        
        if (!hwid) {
            return res.json({ valid: false, message: 'No HWID provided' });
        }
        
        const keys = await loadKeys();
        const keyData = keys[key];
        
        // Key tidak ada
        if (!keyData) {
            return res.json({ valid: false, message: 'Invalid key' });
        }
        
        // Key expired
        if (Date.now() > keyData.expiresAt) {
            delete keys[key];
            await saveKeys(keys);
            return res.json({ valid: false, message: 'Key has expired' });
        }
        
        // HWID check
        if (keyData.hwid === null) {
            // First use - bind HWID
            keys[key].hwid = hwid;
            keys[key].uses = 1;
            keys[key].firstUsed = Date.now();
            await saveKeys(keys);
            console.log('🔗 HWID bound to key');
        } else if (keyData.hwid !== hwid) {
            return res.json({ 
                valid: false, 
                message: 'Key already used on another device' 
            });
        }
        
        // Success
        const remaining = formatTime(keyData.expiresAt - Date.now());
        
        return res.json({
            valid: true,
            message: 'Key validated successfully!',
            expires: remaining + ' remaining'
        });
        
    } catch (error) {
        console.error('Validation error:', error);
        return res.json({ valid: false, message: 'Server error' });
    }
});

// Check Key Status
app.get('/api/check/:key', async (req, res) => {
    try {
        const keys = await loadKeys();
        const keyData = keys[req.params.key];
        
        if (!keyData) {
            return res.json({ exists: false });
        }
        
        const expired = Date.now() > keyData.expiresAt;
        const remaining = expired ? 'Expired' : formatTime(keyData.expiresAt - Date.now());
        
        return res.json({
            exists: true,
            expired: expired,
            hwid_bound: keyData.hwid !== null,
            remaining: remaining,
            created: new Date(keyData.createdAt).toISOString()
        });
    } catch (error) {
        return res.json({ error: 'Server error' });
    }
});

// Admin: View all keys
app.get('/api/admin/keys', async (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin password' });
    }
    
    const keys = await loadKeys();
    const keysList = Object.entries(keys).map(([key, data]) => ({
        key: key,
        created: new Date(data.createdAt).toISOString(),
        expires: new Date(data.expiresAt).toISOString(),
        expired: Date.now() > data.expiresAt,
        hwid_bound: data.hwid !== null,
        remaining: Date.now() > data.expiresAt ? 'Expired' : formatTime(data.expiresAt - Date.now())
    }));
    
    res.json({
        total: keysList.length,
        active: keysList.filter(k => !k.expired).length,
        keys: keysList
    });
});

// Admin: Delete key
app.delete('/api/admin/keys/:key', async (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin password' });
    }
    
    const keys = await loadKeys();
    if (keys[req.params.key]) {
        delete keys[req.params.key];
        await saveKeys(keys);
        return res.json({ success: true, message: 'Key deleted' });
    }
    return res.json({ success: false, message: 'Key not found' });
});

// Admin: Generate manual key
app.post('/api/admin/generate', async (req, res) => {
    if (req.query.password !== CONFIG.ADMIN_KEY) {
        return res.status(403).json({ error: 'Invalid admin password' });
    }
    
    const keys = await loadKeys();
    const newKey = generateKey();
    const hours = parseInt(req.query.hours) || CONFIG.KEY_EXPIRY_HOURS;
    
    keys[newKey] = {
        createdAt: Date.now(),
        expiresAt: Date.now() + (hours * 60 * 60 * 1000),
        hwid: null,
        uses: 0,
        createdBy: 'admin'
    };
    
    await saveKeys(keys);
    
    return res.json({
        success: true,
        key: newKey,
        expires_in: hours + ' hours'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ══════════════════════════════════════════════════════════
// START SERVER
// ══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║        🔐 LOOTLABS KEY SYSTEM - CYCLIC.SH                ║
╠══════════════════════════════════════════════════════════╣
║  ✅ Server running on port ${PORT}                          ║
║  📦 Script: ${CONFIG.SCRIPT_NAME.padEnd(38)}║
║  ⏰ Key Duration: ${(CONFIG.KEY_EXPIRY_HOURS + ' hours').padEnd(34)}║
╚══════════════════════════════════════════════════════════╝
    `);
});
