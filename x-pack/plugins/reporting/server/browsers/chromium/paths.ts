/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

interface ChromiumPackageInfo {
  platform: string;
  architecture: string;
  location: 'common' | 'custom';
  archivePath: string;
  archiveFilename: string;
  archiveChecksum: string;
  binaryChecksum: string;
  binaryRelativePath: string;
}

// We download some zip files from the official chromium download location
// And some custom onces from a Kibana team GCS bucket
enum BaseUrl {
  common = 'https://commondatastorage.googleapis.com/chromium-browser-snapshots', // see https://www.chromium.org/getting-involved/download-chromium
  custom = 'https://storage.googleapis.com/headless_shell', // A Google Cloud Storage bucket the Kibana team project ID
}

export class ChromiumArchivePaths {
  public readonly revision = '848005';

  public readonly packages: ChromiumPackageInfo[] = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archivePath: 'Mac',
      location: 'common',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'ecfda1113d50057a47b9d37a6fd5c19d',
      binaryChecksum: '8d777b3380a654e2730fc36afbfb11e1',
      binaryRelativePath: 'chrome-mac/chrome',
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archivePath: 'Linux_x64',
      location: 'custom',
      archiveFilename: 'chrome-linux.zip',
      archiveChecksum: 'fed381c7760cdd22112f52c044c441a5',
      binaryChecksum: '8d777b3380a654e2730fc36afbfb11e1',
      binaryRelativePath: 'chrome-linux/chrome',
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archivePath: 'Arm',
      location: 'custom',
      archiveFilename: 'chrome-linux.zip',
      archiveChecksum: '20b09b70476bea76a276c583bf72eac7',
      binaryChecksum: 'dcfd277800c1a5c7d566c445cbdc225c',
      binaryRelativePath: 'chrome-linux/chrome',
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archivePath: 'Win',
      location: 'common',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '33301c749b5305b65311742578c52f15',
      binaryChecksum: '9f28dd56c7a304a22bf66f0097fa4de9',
      binaryRelativePath: 'chrome-win32\\chrome.exe',
    },
  ];

  // temporary directory for unzipping the browser
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string) {
    return this.packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: ChromiumPackageInfo) {
    return path.resolve(this.archivesPath, p.archiveFilename);
  }

  public getAllArchiveFilenames(): string[] {
    return this.packages.map((p) => this.resolvePath(p));
  }

  public getDownloadUrl(p: ChromiumPackageInfo) {
    const tail = `/${p.archivePath}/${this.revision}/${p.archiveFilename}`;

    if (p.location === 'common') {
      return BaseUrl.common + tail;
    }
    return BaseUrl.custom + tail;
  }

  public getBinaryPath(p: ChromiumPackageInfo) {
    const chromiumPath = path.resolve(__dirname, '../../../chromium');
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
