/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs/promises';
import path from 'path';

import type { BundledPackage } from '../../../types';
import { appContextService } from '../../app_context';
import { splitPkgKey } from '../registry';

const BUNDLED_PACKAGE_DIRECTORY = path.join(__dirname, '../../../bundled_packages');

export async function getBundledPackages(): Promise<BundledPackage[]> {
  try {
    const dirContents = await fs.readdir(BUNDLED_PACKAGE_DIRECTORY);
    const zipFiles = dirContents.filter((file) => file.endsWith('.zip'));

    const result = await Promise.all(
      zipFiles.map(async (zipFile) => {
        const file = await fs.readFile(path.join(BUNDLED_PACKAGE_DIRECTORY, zipFile));

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
    logger.debug(`Unable to read bundled packages from ${BUNDLED_PACKAGE_DIRECTORY}`);

    return [];
  }
}

export async function getBundledPackageByName(name: string): Promise<BundledPackage | undefined> {
  const bundledPackages = await getBundledPackages();
  const bundledPackage = bundledPackages.find((pkg) => pkg.name === name);

  return bundledPackage;
}
