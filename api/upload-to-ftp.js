const ftp = require('basic-ftp');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { fileName, fileContent, ftpHost, ftpUsername, ftpPassword, ftpPath } = req.body;
    
    // Validate required fields
    if (!fileName || !fileContent || !ftpHost || !ftpUsername || !ftpPassword) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['fileName', 'fileContent', 'ftpHost', 'ftpUsername', 'ftpPassword']
      });
    }
    
    console.log(`Processing upload request for: ${fileName}`);
    
    // Decode base64 content
    const fileBuffer = Buffer.from(fileContent, 'base64');
    
    // Create FTP client
    const client = new ftp.Client();
    client.ftp.verbose = false; // Reduce logging in serverless
    
    try {
      // Connect to FTP server with timeout
      await client.access({
        host: ftpHost,
        port: 21,
        user: ftpUsername,
        password: ftpPassword,
        secure: false,
        secureOptions: { rejectUnauthorized: false }
      });
      
      console.log('Connected to FTP server');
      
      // Change to destination directory if specified
      if (ftpPath && ftpPath !== '/') {
        await client.ensureDir(ftpPath);
        console.log(`Changed to directory: ${ftpPath}`);
      }
      
      // Upload file from buffer
      await client.uploadFrom(
        require('stream').Readable.from(fileBuffer), 
        fileName
      );
      
      console.log(`Successfully uploaded: ${fileName}`);
      
      // Close connection
      client.close();
      
      return res.status(200).json({ 
        success: true, 
        message: `File ${fileName} uploaded successfully`,
        timestamp: new Date().toISOString()
      });
      
    } catch (ftpError) {
      console.error('FTP Error:', ftpError);
      client.close();
      
      return res.status(500).json({ 
        error: 'FTP upload failed', 
        details: ftpError.message 
      });
    }
    
  } catch (error) {
    console.error('General Error:', error);
    return res.status(500).json({ 
      error: 'Upload processing failed', 
      details: error.message 
    });
  }
}

