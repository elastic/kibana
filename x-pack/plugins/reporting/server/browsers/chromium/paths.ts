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
      archiveFilename: 'chromium-ef768c9-darwin_x64.zip',
      archiveChecksum: 'd87287f6b2159cff7c64babac873cc73',
      binaryChecksum: '8d777b3380a654e2730fc36afbfb11e1',
      binaryRelativePath: 'headless_shell-darwin_x64/headless_shell',
    },
    {
      platforms: ['linux'],
      architecture: 'x64',
      archiveFilename: 'chromium-ef768c9-linux_x64.zip',
      archiveChecksum: '85575e8fd56849f4de5e3584e05712c0',
      binaryChecksum: '38c4d849c17683def1283d7e5aa56fe9',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
    },
    {
      platforms: ['linux'],
      architecture: 'arm64',
      archiveFilename: 'chromium-ef768c9-linux_arm64.zip',
      archiveChecksum: '20b09b70476bea76a276c583bf72eac7',
      binaryChecksum: 'dcfd277800c1a5c7d566c445cbdc225c',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
    },
    {
      platforms: ['win32'],
      architecture: 'x64',
      archiveFilename: 'chromium-ef768c9-windows_x64.zip',
      archiveChecksum: '33301c749b5305b65311742578c52f15',
      binaryChecksum: '9f28dd56c7a304a22bf66f0097fa4de9',
      binaryRelativePath: 'headless_shell-windows_x64\\headless_shell.exe',
    },
  ],
};
