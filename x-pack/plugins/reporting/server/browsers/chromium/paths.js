/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export const paths = {
  archivesPath: path.resolve(__dirname, '../../../.chromium'),
  baseUrl: 'https://s3.amazonaws.com/headless-shell/',
  packages: [{
    platforms: ['darwin', 'freebsd', 'openbsd'],
    archiveFilename: 'chromium-2fac04a-darwin.zip',
    archiveChecksum: '36814b1629457aa178b4ecdf6cc1bc5f',
    rawChecksum: '9b40e2efa7f4f1870835ee4cdaf1dd51',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'chromium-04c5a83-linux.zip',
    archiveChecksum: '1339f6d57b6039445647dcdc949ba513',
    rawChecksum: '4824710dd8f3da9d9e2c0674a771008b',
    binaryRelativePath: 'headless_shell-linux/headless_shell'
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-04c5a83-windows.zip',
    archiveChecksum: '3b3279b59ebf03db676baeb7b7ab5c24',
    rawChecksum: '724011f9acf872c9472c82c6f7981178',
    binaryRelativePath: 'headless_shell-windows\\headless_shell.exe'
  }]
};

export const getChromeLogLocation = (binaryPath) =>
  path.join(binaryPath, '..', 'chrome_debug.log');
