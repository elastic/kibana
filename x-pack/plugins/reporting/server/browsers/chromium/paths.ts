/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export const paths = {
  archivesPath: path.resolve(__dirname, '../../../../../../.chromium'),
  baseUrl: 'https://storage.googleapis.com/headless_shell/',
  packages: [
    {
      platforms: ['darwin', 'freebsd', 'openbsd'],
      architecture: 'x64',
      archiveFilename: 'chromium-312d84c-darwin.zip',
      archiveChecksum: '020303e829745fd332ae9b39442ce570',
      binaryChecksum: '5cdec11d45a0eddf782bed9b9f10319f',
      binaryRelativePath: 'headless_shell-darwin/headless_shell',
    },
    {
      platforms: ['linux'],
      architecture: 'x64',
      archiveFilename: 'chromium-312d84c-linux.zip',
      archiveChecksum: '15ba9166a42f93ee92e42217b737018d',
      binaryChecksum: 'c7fe36ed3e86a6dd23323be0a4e8c0fd',
      binaryRelativePath: 'headless_shell-linux/headless_shell',
    },
    {
      platforms: ['linux'],
      architecture: 'arm64',
      archiveFilename: 'chromium-312d84c-linux_arm64.zip',
      archiveChecksum: 'aa4d5b99dd2c1bd8e614e67f63a48652',
      binaryChecksum: '7fdccff319396f0aee7f269dd85fe6fc',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
    },
    {
      platforms: ['win32'],
      architecture: 'x64',
      archiveFilename: 'chromium-312d84c-windows.zip',
      archiveChecksum: '3e36adfb755dacacc226ed5fd6b43105',
      binaryChecksum: '9913e431fbfc7dfcd958db74ace4d58b',
      binaryRelativePath: 'headless_shell-windows\\headless_shell.exe',
    },
  ],
};
