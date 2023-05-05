/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import assert from 'assert';
import axios from 'axios';
import path from 'path';
import { PackageInfo } from '..';
import { paths as chromiumArchivePaths } from '../../../utils';
import { download } from '../../download';
import { md5 } from '../../download/checksum';
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
  platform,
  architecture,
]);

describe.each(packageInfos)(
  'Chromium download URLs and checksums: %s-%s',
  (platform, architecture) => {
    // For testing, suffix the unzip folder by cpu + platform so the extracted folders do not overwrite each other in the cache
    const chromiumPath = path.resolve(__dirname, '../../../../chromium', architecture, platform);

    const originalAxios = axios.defaults.adapter;
    let binaryChecksum: string;
    beforeAll(async () => {
      axios.defaults.adapter = require('axios/lib/adapters/http'); // allow Axios to send actual requests

      const binaryPath = chromiumArchivePaths.getBinaryPath(pkg, chromiumPath);
      binaryChecksum = await md5(binaryPath).catch(() => 'MISSING');
    });

    afterAll(() => {
      axios.defaults.adapter = originalAxios;
    });

    // Allow package definition to be altered to check error handling
    const originalPkg = chromiumArchivePaths.packages.find(
      (packageInfo) =>
        packageInfo.platform === platform && packageInfo.architecture === architecture
    );
    assert(originalPkg);

    let pkg: PackageInfo = originalPkg;
    beforeEach(() => {
      pkg = { ...originalPkg };
    });

    it('lists the correct archive checksum', async () => {
      await download(chromiumArchivePaths, pkg, mockLogger); // this will throw if the downloaded file's checksum does not match the listing
    });

    it('lists the correct binary checksum', async () => {
      await install(chromiumArchivePaths, mockLogger, pkg, chromiumPath);

      assert(
        binaryChecksum === pkg.binaryChecksum,
        `Extracted browser binary checksum [${binaryChecksum}] must match package info [${pkg.binaryChecksum}]`
      );
    });
  }
);
