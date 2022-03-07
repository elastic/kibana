/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import fs from 'fs/promises';

import JSON5 from 'json5';
import { REPO_ROOT } from '@kbn/utils';

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
    const bundledPackages = await getBundledPackageEntries();

    const packageObjects = await Promise.all(
      bundledPackages.map(async (bundledPackage) => {
        const registryPackage = await Registry.getRegistryPackage(
          bundledPackage.name,
          bundledPackage.version
        );

        const packageArchive = await Registry.fetchArchiveBuffer(
          bundledPackage.name,
          bundledPackage.version
        );

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
