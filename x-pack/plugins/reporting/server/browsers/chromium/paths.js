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
    archiveFilename: 'chromium-4747cc2-darwin.zip',
    archiveChecksum: '23e769b9fdbbb7efdac719c03738c56d',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'chromium-4747cc2-linux.zip',
    archiveChecksum: '8f361042d0fc8a84d60cd01777ec260f',
    binaryRelativePath: 'headless_shell-linux/headless_shell'
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-4747cc2-windows.zip',
    archiveChecksum: '99547641a07745fc095211706162323d',
    binaryRelativePath: 'headless_shell-windows\\headless_shell.exe'
  }]
};
