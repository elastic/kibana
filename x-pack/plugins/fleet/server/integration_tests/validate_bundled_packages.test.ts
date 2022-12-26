/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';

import JSON5 from 'json5';
import { REPO_ROOT } from '@kbn/repo-info';

import * as Registry from '../services/epm/registry';
import { generatePackageInfoFromArchiveBuffer } from '../services/epm/archive';

import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';

import { useDockerRegistry } from './helpers';

describe('validate bundled packages', () => {
  const registryUrl = useDockerRegistry();
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;

  beforeEach(() => {
    mockContract = createAppContextStartContractMock({ registryUrl });
    appContextService.start(mockContract);
  });

  async function getBundledPackageEntries() {
    const configFilePath = path.resolve(REPO_ROOT, 'fleet_packages.json');
    const configFile = await fs.readFile(configFilePath, 'utf8');
    const bundledPackages = JSON5.parse(configFile);

    return bundledPackages as Array<{ name: string; version: string }>;
  }

  async function setupPackageObjects() {
    // APM is a special case package in that it's "bundled release" is not available
    // on the v2 registry image, because v2 currently only contains production packages.
    // We bundle APM from snapshot, but that bundled version isn't available in the docker
    // image that's running EPR during FTR runs, so to avoid nasty test failures we don't
    // verify APM here.
    const EXCLUDED_PACKAGES = ['apm'];

    const bundledPackages = await getBundledPackageEntries();

    const packageObjects = await Promise.all(
      bundledPackages
        .filter((pkg) => !EXCLUDED_PACKAGES.includes(pkg.name))
        .map(async (bundledPackage) => {
          const registryPackage = await Registry.getPackage(
            bundledPackage.name,
            bundledPackage.version
          );

          const packageArchive = await Registry.fetchArchiveBuffer({
            pkgName: bundledPackage.name,
            pkgVersion: bundledPackage.version,
            shouldVerify: false,
          });

          return { registryPackage, packageArchive };
        })
    );

    return packageObjects;
  }

  it('generates matching package info objects for uploaded and registry packages', async () => {
    const packageObjects = await setupPackageObjects();

    for (const packageObject of packageObjects) {
      const { registryPackage, packageArchive } = packageObject;

      const archivePackageInfo = await generatePackageInfoFromArchiveBuffer(
        packageArchive.archiveBuffer,
        'application/zip'
      );

      expect(archivePackageInfo.packageInfo.data_streams).toEqual(
        registryPackage.packageInfo.data_streams
      );
    }
  });
});
