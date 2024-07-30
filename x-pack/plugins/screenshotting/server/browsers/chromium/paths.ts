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
      archiveChecksum: 'fa8004f3c8c5574c089c901e48429d1b01720bf3dd25e05ac56c41d0ab470c10',
      binaryChecksum: '56f25cb6881e5c2b1aac0d8e87630517d1af8effdc9319d35f872add048df1ca',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1300317, // 1300313 is not available for Mac_x64
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'bea49fd3ccd6aaccd7cdc4df38306f002a2934aaa2c044f3b5a3272b31ec77ca',
      binaryChecksum: '4c55d9e47deb1179c377c9785afdcdb5f3d3f351bff62b414d43e32ff195bd55',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1300314, // 1300313 is not available for Mac_Arm
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-46cf136-locales-linux_x64.zip',
      archiveChecksum: '8ea5f2d72352230f7927725a6ffd6d5fb462a0c8ad76e320003748b62df6d221',
      binaryChecksum: 'e7f8109ef7535dab500166b335524dfa4e92324fa31a2a61f510a5fa5afc2eee',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1300313,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-46cf136-locales-linux_arm64.zip',
      archiveChecksum: '7d01fe8a78a019cf714c913d37353f85d54c4c7d4fde91d6c96605d259a66414',
      binaryChecksum: 'd1a8b8708dc5ced8a9c526a0d823a4074325573f9c06fabe14e18fd3a36691c9',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1300313,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '27a2ed1473cefc6f48ff5665faa1fbcc69ef5be47ee21777a60e87c8379fdd93',
      binaryChecksum: 'd603401a5e6f8bd734b329876e4221a4d24a1999f14df6e32eeb5e6a72520d96',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1300320, // 1300313 is not available for win32
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
