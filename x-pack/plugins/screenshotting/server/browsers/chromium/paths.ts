/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

export interface PackageInfo {
  platform: 'linux' | 'darwin' | 'win32';
  architecture: 'x64' | 'arm64';
  archiveFilename: string;
  archiveChecksum: string;
  binaryChecksum: string;
  binaryRelativePath: string;
  revision: 901912 | 901913;
  isPreInstalled: boolean;
  location: 'custom' | 'common';
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

function isCommonPackage(p: PackageInfo): p is CommonPackageInfo {
  return p.location === 'common';
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | CommonPackageInfo> = [
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
      isPreInstalled: false,
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
      revision: 901913, // NOTE: 901912 is not available
      isPreInstalled: false,
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
      isPreInstalled: true,
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
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '861bb8b7b8406a6934a87d3cbbce61d9',
      binaryChecksum: 'ffa0949471e1b9a57bc8f8633fca9c7b',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      location: 'common',
      archivePath: 'Win',
      revision: 901912,
      isPreInstalled: true,
    },
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string, packages: PackageInfo[] = this.packages) {
    return packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: PackageInfo) {
    // adding architecture to the path allows it to download two binaries that have the same name, but are different architecture
    return path.resolve(this.archivesPath, p.architecture, p.archiveFilename);
  }

  public getAllArchiveFilenames(): string[] {
    return this.packages.map((p) => this.resolvePath(p));
  }

  public getDownloadUrl(p: PackageInfo) {
    if (isCommonPackage(p)) {
      return `${BaseUrl.common}/${p.archivePath}/${p.revision}/${p.archiveFilename}`;
    }
    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo, chromiumPath: string) {
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
