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
      archiveChecksum: '2577b515b871b507a9c830cdf5a360e6a966dc058e07307ad1a21a22ae681d4c',
      binaryChecksum: '80287437016fd444f78822017c3dba939984b627c18cba57b052136323aa82ef',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1233115, // 1233107 is not available for Mac Intel
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'c2219ea9dea838eef2ea350c4d2591fc91090fd7a920dfa010fa44d8c31db515',
      binaryChecksum: '2b5c892e3125eecd31b651f4632cbafabee3a31c02728dcddafee8d462ab075d',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1233124, // 1233107 is not available for Mac_Arm
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-3f98d69-locales-linux_x64.zip',
      archiveChecksum: '251e4cf450bfab59154a2a366e724db65df521016d3fc651e9fe5cbe6970b7b0',
      binaryChecksum: 'cd888114440b25c29a653563e56a29dc1ae2cebbf335e557f99100c5402bc302',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1233107,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-3f98d69-locales-linux_arm64.zip',
      archiveChecksum: '87e59ba3fb20649301a27f56d3328d970812ecb473b23ad216f9122739a40bf0',
      binaryChecksum: '2a44c60e7f85e47533beace3d5dc6271803f87e8fc2083e8cdc612e8cf4366b9',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1233107,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: 'b7c04da4d51ee03eca5ffa6c440c951375147d913647375e30bd52e9d67c6caf',
      binaryChecksum: '52fe4b81323c73d48cb50e80d16e61e1aced809e19d984d9df20169efdf63b5b',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1233121, // 1233107 is not available for win
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
