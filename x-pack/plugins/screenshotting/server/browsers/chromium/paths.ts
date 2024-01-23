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
      archiveChecksum: '35261c7a88f1797d27646c340eeaf7d7d70727f0c4ae884e8400240ed66d7192',
      binaryChecksum: 'ca90fe7573ddb0723d633fe526acf0fdefdda570a549f35e15c111d10f3ffc0d',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1204244, // 1204232 is not available for Mac Intel
      location: 'common',
      archivePath: 'Mac',
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: '1ed375086a9505ee6bc9bc1373bebd79e87e5b27af5a93258ea25ffb6f71f03c',
      binaryChecksum: 'a8556ed7ac2a669fa81f752f7d18a9d1e9b99b05d3504f6bbc08e3e0b02ff71e',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      revision: 1204255, // 1204232 is not available for Mac_Arm
      location: 'common',
      archivePath: 'Mac_Arm',
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-38c7255-locales-linux_x64.zip',
      archiveChecksum: 'bf07734366ece771a85b2452fd63e5981b1abc234ef0ed1c7d0774b8a7b5c6a9',
      binaryChecksum: '87a991c412ad333549a58524b6be23f2a1ff56af61bb1a1b10c1f4a0206edc2a',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      revision: 1204232,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-38c7255-locales-linux_arm64.zip',
      archiveChecksum: '11c1cd2398ae3b57a72e7746e1f1cbbd2c2d18d1b83dec949dc81a3c690688f0',
      binaryChecksum: '4d914034d466b97c438283dbc914230e087217c25028f403dfa3c933ea755e94',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      revision: 1204232,
      location: 'custom',
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: 'd6f5a21973867115435814c2c46d49edd9a0a2ad6da14b4724746374cad80e47',
      binaryChecksum: '9c0d2404004bd7c4ada649049422de6958460ecf6cec53460a478c6d8c33e444',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      revision: 1204234, // 1204232 is not available for win
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
