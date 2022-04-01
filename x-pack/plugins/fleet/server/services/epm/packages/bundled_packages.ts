/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';

import type { BundledPackage } from '../../../types';
import { IngestManagerError } from '../../../errors';
import { appContextService } from '../../app_context';
import { splitPkgKey } from '../registry';

export async function getBundledPackages(): Promise<BundledPackage[]> {
  const config = appContextService.getConfig();

  const bundledPackageLocation = config?.developer?.bundledPackageLocation;

  if (!bundledPackageLocation) {
    throw new IngestManagerError('xpack.fleet.developer.bundledPackageLocation is not configured');
  }

  try {
    const dirContents = await fs.readdir(bundledPackageLocation);
    const zipFiles = dirContents.filter((file) => file.endsWith('.zip'));

    const result = await Promise.all(
      zipFiles.map(async (zipFile) => {
        const file = await fs.readFile(path.join(bundledPackageLocation, zipFile));

        const { pkgName, pkgVersion } = splitPkgKey(zipFile.replace(/\.zip$/, ''));

        return {
          name: pkgName,
          version: pkgVersion,
          buffer: file,
        };
      })
    );

    return result;
  } catch (err) {
    const logger = appContextService.getLogger();
    logger.debug(`Unable to read bundled packages from ${bundledPackageLocation}`);

    return [];
  }
}

export async function getBundledPackageByName(name: string): Promise<BundledPackage | undefined> {
  const bundledPackages = await getBundledPackages();
  const bundledPackage = bundledPackages.find((pkg) => pkg.name === name);

  return bundledPackage;
}
