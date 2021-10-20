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
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chromium-d163fd7-darwin_x64.zip',
      archiveChecksum: '19aa88bd59e2575816425bf72786c53f',
      binaryChecksum: 'dfcd6e007214175997663c50c8d871ea',
      binaryRelativePath: 'headless_shell-darwin_x64/headless_shell',
      location: 'custom',
      revision: 856583,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-70f5d88-linux_x64.zip',
      archiveChecksum: '7b1c9c2fb613444fbdf004a3b75a58df',
      binaryChecksum: '82e80f9727a88ba3836ce230134bd126',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      revision: 901912,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-70f5d88-linux_arm64.zip',
      archiveChecksum: '4a0217cfe7da86ad1e3d0e9e5895ddb5',
      binaryChecksum: '29e943fbee6d87a217abd6cb6747058e',
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
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string) {
    return this.packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: PackageInfo) {
    // adding architecture to the path allows it to download two binaries that have the same name, but are different architecture
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
