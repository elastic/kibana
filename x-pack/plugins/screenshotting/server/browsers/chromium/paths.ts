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
  revision: 1022525;
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
      archiveChecksum: 'f01bce8b78afdf169d7753d537280d93',
      binaryChecksum: '53ada24ba58fbb978d3e7cd762bf6bf2',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      location: 'common',
      archivePath: 'Mac',
      revision: 1022525,
      isPreInstalled: false,
    },
    {
      platform: 'darwin',
      architecture: 'arm64',
      archiveFilename: 'chrome-mac.zip',
      archiveChecksum: 'a8ec8fcc5a35604f46d8a9dd8c308a9c',
      binaryChecksum: '27ab9da01ef5c0a7f03656a88ed189c4',
      binaryRelativePath: 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      location: 'common',
      archivePath: 'Mac_Arm',
      revision: 1022525,
      isPreInstalled: false,
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-4440632-linux_x64.zip',
      archiveChecksum: '2f88e9a17e156d27779e485dcce0946c',
      binaryChecksum: '23dd841491a00b3a7c9b8dafbe1ddc4b',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
      revision: 1022525,
      isPreInstalled: true,
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-4440632-linux_arm64.zip',
      archiveChecksum: '270508a8a00a7cfe7e8d0c7203016df6',
      binaryChecksum: '6c7cc42d0bdf81b3709d45eb76a83d4f',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
      revision: 1022525,
      isPreInstalled: true,
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: 'e67596cfe37301e3357e9c1c7f3a094a',
      binaryChecksum: '3ccb7781fff4c4470fbd0c5f471a8d21',
      binaryRelativePath: path.join('chrome-win', 'chrome.exe'),
      location: 'common',
      archivePath: 'Win',
      revision: 1022525,
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
