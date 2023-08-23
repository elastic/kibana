/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import axios from 'axios';
import { createMockLevelLogger } from '../../../test_helpers';
import { download } from '../../download/download';
import { ChromiumArchivePaths, PackageInfo } from '../paths';

/**
 * NOTE: these test cases download actual browsers. Running the suite could take
 * a long time with a clean cache.
 */

// test case tuples
const chromiumArchivePaths = new ChromiumArchivePaths();
const packageInfos = chromiumArchivePaths.packages.map(({ platform, architecture }) => [
  architecture,
  platform,
]);

const mockLogger = createMockLevelLogger();

describe.each(packageInfos)('Chromium archive: %s/%s', (architecture, platform) => {
  // For testing, suffix the unzip folder by cpu + platform so the extracted folders do not overwrite each other in the cache

  const originalAxios = axios.defaults.adapter;
  beforeAll(async () => {
    axios.defaults.adapter = 'http';
  });

  afterAll(() => {
    axios.defaults.adapter = originalAxios;
  });

  // Allow package definition to be altered to check error handling
  const originalPkg = chromiumArchivePaths.find(platform, architecture);
  assert(originalPkg);

  let pkg: PackageInfo = originalPkg;
  beforeEach(() => {
    pkg = { ...originalPkg };
  });

  const downloadUrl = chromiumArchivePaths.getDownloadUrl(pkg);
  const downloadPath = chromiumArchivePaths.resolvePath(pkg);

  it('references the correct checksums and binary path', async () => {
    const downloadedChecksum = await download(downloadUrl, downloadPath, mockLogger);
    expect(downloadedChecksum).toBe(pkg.archiveChecksum);

    // This piece must be skipped (7.17 only) since `extract` has no return value.
    // const binaryPath = await extract(downloadPath, archivesPath);
    // expect(binaryPath).toBe(path.join(chromiumPath, pkg.binaryRelativePath));
  });
});
