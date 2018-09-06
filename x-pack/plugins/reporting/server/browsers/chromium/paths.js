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
    archiveFilename: 'chromium-4747cc2-darwin.zip',
    archiveChecksum: '3f509e2fa994da3a1399d18d03b6eef7',
    rawChecksum: 'c657bdde14f10b555b9d7ecb644ef695',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'chromium-4747cc2-linux.zip',
    archiveChecksum: '8f361042d0fc8a84d60cd01777ec260f',
    rawChecksum: '8dfa6f823c663aa860ccdfa11de6713f',
    binaryRelativePath: 'headless_shell-linux/headless_shell'
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-4747cc2-windows.zip',
    archiveChecksum: 'fac0967cd54bb2492a5a858fbefdf983',
    rawChecksum: 'b46de931336a341503d740ec692acbbd',
    binaryRelativePath: 'headless_shell-windows\\headless_shell.exe'
  }]
};
