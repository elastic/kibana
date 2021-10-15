/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

interface PackageInfo {
  platform: string;
  architecture: string;
  archiveFilename: string;
  archiveChecksum: string;
  binaryChecksum: string;
  binaryRelativePath: string;
  revision: number;
}

enum BaseUrl {
  // see https://www.chromium.org/getting-involved/download-chromium
  common = 'https://commondatastorage.googleapis.com/chromium-browser-snapshots',
  // A GCS bucket under the Kibana team
  custom = 'https://storage.googleapis.com/headless_shell',
}

interface CustomPackageInfo extends PackageInfo {
  location: 'custom';
}
interface CommonPackageInfo extends PackageInfo {
  location: 'common';
  archivePath: string;
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | CommonPackageInfo> = [
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-70f5d88-linux_x64.zip',
      archiveChecksum: 'tomato',
      binaryChecksum: 'potato',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      revision: 901912,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-70f5d88-linux_arm64.zip',
      archiveChecksum: 'cabbage',
      binaryChecksum: 'leek',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      revision: 901912,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '861bb8b7b8406a6934a87d3cbbce61d9',
      binaryChecksum: 'ffa0949471e1b9a57bc8f8633fca9c7b',
      binaryRelativePath: 'chrome-win\\chrome.exe',
      location: 'common',
      archivePath: 'Win',
      revision: 901912,
    },
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: '229fd88c73c5878940821875f77578e4',
      binaryChecksum: 'b0e5ca009306b14e41527000139852e5',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      location: 'common',
      archivePath: 'Mac',
      revision: 901912,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'ecf7aa509c8e2545989ebb9711e35384',
      binaryChecksum: 'b5072b06ffd2d2af4fea7012914da09f',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      location: 'common',
      archivePath: 'Mac_Arm',
      revision: 901913, // 901912 is not available for Mac_Arm. 901913 should be "close enough"
    },
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string) {
    // We're downloading Chromium for both Mac x64 and Mac Arm,
    // therefore we need to distinguish the download folder by architecture,
    // because both downloads are "chrome-mac.zip".
    return this.packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: PackageInfo) {
    return path.resolve(this.archivesPath, p.architecture, p.archiveFilename);
  }

  public getAllArchiveFilenames(): string[] {
    return this.packages.map((p) => this.resolvePath(p));
  }

  public getDownloadUrl(p: CustomPackageInfo | CommonPackageInfo) {
    if (p.location === 'common') {
      return `${BaseUrl.common}/${p.archivePath}/${p.revision}/${p.archiveFilename}`;
    }
    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo) {
    const chromiumPath = path.resolve(__dirname, '../../../chromium');
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
