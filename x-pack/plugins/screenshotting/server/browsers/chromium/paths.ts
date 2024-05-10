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
  isPreInstalled: boolean;
  location: 'custom' | 'common';
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

function isCommonPackage(p: PackageInfo): p is CommonPackageInfo {
  return p.location === 'common';
}

export class ChromiumArchivePaths {
  public readonly packages: Array<CustomPackageInfo | CommonPackageInfo> = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'd9b07faf9607cabf019282e30b81324542b259b9e1e1e85b9ac550fb680cf84d',
      binaryChecksum: 'bf8ee3dcf9d4124c9dcaf3986a4ff633b2c7e12d57e06813aa7441b22935765d',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1250580,
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: '8278ea0dba09f3cb8e74ed87ef0d10930c5bbc66f46711dfe82fa807a2053611',
      binaryChecksum: '9ff994371f828a9e7ac8c69f95fd1d38b1115c438f4f94a4d75a41843ec53673',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1250595, // 1250580 is not available for Mac_Arm
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-81bc525-locales-linux_x64.zip',
      archiveChecksum: 'b5d6bfca425e166d8dc15c556a935d79f1f23a4c7d52cecf16a8245c215336ce',
      binaryChecksum: 'ec1c63d3509513b1324c58725c08668e3ff445f2e459ba934c1232016e27701e',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1250580,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-81bc525-locales-linux_arm64.zip',
      archiveChecksum: 'b2ec85aa31956d272a7ab221edeea6ca41f8719ebf22f1d1853b8c4827babeaa',
      binaryChecksum: 'f43490761fa34d511208abf684c0c9ee48fedbd2d0e311404779f9dc4e33549c',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1250580,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '6d1838bd84bf182e75fc31f387971b9c7ca3204ae67d4724fe34fe6a953c1662',
      binaryChecksum: 'f785da29c45a5301dde6a68cb80f97fcc7233e8810db7550cfa053bc5968a61c',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1250580,
      location: 'common',
      archivePath: 'Win',
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
      const { common } = BaseUrl;
      const { archivePath, revision, archiveFilename } = p;
      return `${common}/${archivePath}/${revision}/${archiveFilename}`;
    }
    return BaseUrl.custom + '/' + p.archiveFilename; // revision is not used for URL if package is a custom build
  }

  public getBinaryPath(p: PackageInfo, chromiumPath: string) {
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
