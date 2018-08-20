/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export const paths = {
  archivesPath: path.resolve(__dirname, '../../../.chromium'),
  baseUrl: 'https://s3.amazonaws.com/headless-shell-dev/',
  packages: [{
    platforms: ['darwin', 'freebsd', 'openbsd'],
    archiveFilename: 'chromium-68.0.3440.106-darwin.zip',
    archiveChecksum: '68ffc0a821c98b539c6158ed82fa37fc',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'chromium-68.0.3440.106-linux.zip',
    archiveChecksum: '38db7736585dbf8e4d11dbf25d23bab2',
    binaryRelativePath: 'headless_shell-linux/headless_shell'
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-68.0.3440.106-win32.zip',
    archiveChecksum: '37416b13e074e80f5bbb9796a5fb6198',
    binaryRelativePath: 'headless_shell-win32\\headless_shell.exe'
  }]
};
