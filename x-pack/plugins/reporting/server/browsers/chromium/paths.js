/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import path from 'path';

export const paths = {
  archivesPath: path.resolve(__dirname, '../../../.chromium'),
  baseUrl: 'https://github.com/adieuadieu/serverless-chrome/releases/download/v1.0.0-53/',
  packages: [{
    platforms: ['darwin', 'freebsd', 'openbsd'],
    archiveFilename: 'chromium-503a3e4-darwin.zip',
    archiveChecksum: 'c1b530f99374e122c0bd7ba663867a95',
    binaryRelativePath: 'headless_shell-darwin/headless_shell',
  }, {
    platforms: ['linux'],
    archiveFilename: 'stable-headless-chromium-amazonlinux-2017-03.zip',
    archiveChecksum: 'd752c95520d42c666574c271dda8fd65',
    binaryRelativePath: ''
  }, {
    platforms: ['win32'],
    archiveFilename: 'chromium-503a3e4-win32.zip',
    archiveChecksum: 'a71ce5565791767492f6d0fb4fe5360d',
    binaryRelativePath: 'headless_shell-win32\\headless_shell.exe'
  }]
};
