/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import { download } from '../../download';
import { ChromiumArchivePaths } from '../paths';

describe('Chromium Archive Paths', () => {
  const archivePaths = new ChromiumArchivePaths();
  const packageInfos = archivePaths.packages.map(({ platform, architecture }) => [
    platform,
    architecture,
  ]);

  it.each(packageInfos)('list the correct checksums, %s-%s', async (platform, architecture) => {
    const pkg = archivePaths.packages.find(
      (packageInfo) =>
        packageInfo.platform === platform && packageInfo.architecture === architecture
    );

    assert(pkg);

    await download(archivePaths, pkg);

    // TODO: validate the actual checksum against the pkg info
  });
});
