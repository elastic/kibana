/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { PackageInfo } from '@kbn/screenshotting-server';
import assert from 'assert';
import axios from 'axios';
import path from 'path';
import { paths as chromiumArchivePaths } from '../../../utils';
import { download } from '../../download';
import { install } from '../../install';

/* eslint-disable no-console */

const mockLogger = loggingSystemMock.create().get();
mockLogger.warn = jest.fn((message: string | Error) => {
  console.warn(message);
});
mockLogger.debug = jest.fn((message: string | Error) => {
  console.log(message);
});
mockLogger.error = jest.fn((message: string | Error) => {
  console.error(message);
});

/**
 * NOTE: these test cases download actual browsers. Running the suite could take
 * a long time with a clean cache.
 */

// test case tuples
const packageInfos = chromiumArchivePaths.packages.map(({ platform, architecture }) => [
  architecture,
  platform,
]);

describe.each(packageInfos)('Chromium archive: %s/%s', (architecture, platform) => {
  // For testing, suffix the unzip folder by cpu + platform so the extracted folders do not overwrite each other in the cache
  const chromiumPath = path.resolve(__dirname, '../../../../chromium', architecture, platform);

  const originalAxios = axios.defaults.adapter;
  beforeAll(async () => {
    axios.defaults.adapter = 'http';
  });

  afterAll(() => {
    axios.defaults.adapter = originalAxios;
  });

  // Allow package definition to be altered to check error handling
  const originalPkg = chromiumArchivePaths.packages.find(
    (packageInfo) => packageInfo.platform === platform && packageInfo.architecture === architecture
  );
  assert(originalPkg);

  let pkg: PackageInfo = originalPkg;
  beforeEach(() => {
    pkg = { ...originalPkg };
  });

  it('references the correct checksums and binary path', async () => {
    const downloadedChecksum = await download(chromiumArchivePaths, pkg, mockLogger);
    expect(downloadedChecksum).toBe(pkg.archiveChecksum);

    const binaryPath = await install(chromiumArchivePaths, mockLogger, pkg, chromiumPath);
    expect(binaryPath).toBe(path.join(chromiumPath, pkg.binaryRelativePath));
  });
});
