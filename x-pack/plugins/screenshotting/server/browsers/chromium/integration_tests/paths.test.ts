/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import assert from 'assert';
import axios from 'axios';
import del from 'del';
import path from 'path';
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

describe('Chromium Archive Paths', () => {
  const originalAxios = axios.defaults.adapter;
  beforeAll(async () => {
    axios.defaults.adapter = require('axios/lib/adapters/http');

    // remove existing archives to force downloads
    const removedFiles = await del(`${chromiumArchivePaths.archivesPath}/**/*`, {
      force: true,
    });

    removedFiles.forEach((rm) => mockLogger?.warn(`Deleting test workspace file ${rm}`));
  });
  afterAll(() => {
    axios.defaults.adapter = originalAxios;
  });

  const packageInfos = chromiumArchivePaths.packages.map(({ platform, architecture }) => [
    platform,
    architecture,
  ]);

  it.each(packageInfos)('list the correct checksums, %s-%s', async (platform, architecture) => {
    const pkg = chromiumArchivePaths.packages.find(
      (packageInfo) =>
        packageInfo.platform === platform && packageInfo.architecture === architecture
    );

    assert(pkg);

    const chromiumPath = path.resolve(__dirname, '../../../../chromium');
    const binaryPath = chromiumArchivePaths.getBinaryPath(pkg, chromiumPath);
    console.log(binaryPath);

    await download(chromiumArchivePaths, pkg, mockLogger);
    await install(chromiumArchivePaths, mockLogger, pkg, chromiumPath);

    const binaryChecksum = await md5(binaryPath).catch(() => 'MISSING');

    assert(
      binaryChecksum === pkg.binaryChecksum,
      `extracted browser binary checksum [${binaryChecksum}] must match package info [${pkg.binaryChecksum}]`
    );
  });
});
