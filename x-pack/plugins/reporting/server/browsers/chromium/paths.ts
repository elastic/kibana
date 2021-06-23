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
  public readonly revision = '856583';

  public readonly packages: Array<CustomPackageInfo | CommonPackageInfo> = [
    {
      platform: 'darwin',
      architecture: 'x64',
      archiveFilename: 'chromium-d163fd7-darwin_x64.zip',
      archiveChecksum: '19aa88bd59e2575816425bf72786c53f',
      binaryChecksum: 'dfcd6e007214175997663c50c8d871ea',
      binaryRelativePath: 'headless_shell-darwin_x64/headless_shell',
      location: 'custom',
    },
    {
      platform: 'linux',
      architecture: 'x64',
      archiveFilename: 'chromium-d163fd7-linux_x64.zip',
      archiveChecksum: 'fba0a240d409228a3494aef415c300fc',
      binaryChecksum: '99cfab472d516038b94ef86649e52871',
      binaryRelativePath: 'headless_shell-linux_x64/headless_shell',
      location: 'custom',
    },
    {
      platform: 'linux',
      architecture: 'arm64',
      archiveFilename: 'chromium-d163fd7-linux_arm64.zip',
      archiveChecksum: '29834735bc2f0e0d9134c33bc0580fb6',
      binaryChecksum: '13baccf2e5c8385cb9d9588db6a9e2c2',
      binaryRelativePath: 'headless_shell-linux_arm64/headless_shell',
      location: 'custom',
    },
    {
      platform: 'win32',
      architecture: 'x64',
      archiveFilename: 'chrome-win.zip',
      archiveChecksum: '64999a384bfb6c96c50c4cb6810dbc05',
      binaryChecksum: '13b8bbb4a12f9036b8cc3b57b3a71fec',
      binaryRelativePath: 'chrome-win\\chrome.exe',
      location: 'common',
      archivePath: 'Win',
    },
  ];

  // zip files get downloaded to a .chromium directory in the kibana root
  public readonly archivesPath = path.resolve(__dirname, '../../../../../../.chromium');

  public find(platform: string, architecture: string) {
    return this.packages.find((p) => p.platform === platform && p.architecture === architecture);
  }

  public resolvePath(p: PackageInfo) {
    return path.resolve(this.archivesPath, p.archiveFilename);
  }

  public getAllArchiveFilenames(): string[] {
    return this.packages.map((p) => this.resolvePath(p));
  }

  public getDownloadUrl(p: CustomPackageInfo | CommonPackageInfo) {
    if (p.location === 'common') {
      return `${BaseUrl.common}/${p.archivePath}/${this.revision}/${p.archiveFilename}`;
    }
    return BaseUrl.custom + '/' + p.archiveFilename;
  }

  public getBinaryPath(p: PackageInfo) {
    const chromiumPath = path.resolve(__dirname, '../../../chromium');
    return path.join(chromiumPath, p.binaryRelativePath);
  }
}
