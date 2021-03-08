/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import * as Registry from '../registry';

import { getInstallationObject } from './index';
import { upgradePackage } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToUpgrade: string[];
  esClient: ElasticsearchClient;
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToUpgrade,
  esClient,
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const installedAndLatestPromises = packagesToUpgrade.map((pkgToUpgrade) =>
    Promise.all([
      getInstallationObject({ savedObjectsClient, pkgName: pkgToUpgrade }),
      Registry.fetchFindLatestPackage(pkgToUpgrade),
    ])
  );
  const installedAndLatestResults = await Promise.allSettled(installedAndLatestPromises);
  const installResponsePromises = installedAndLatestResults.map(async (result, index) => {
    const pkgToUpgrade = packagesToUpgrade[index];
    if (result.status === 'fulfilled') {
      const [installedPkg, latestPkg] = result.value;
      return upgradePackage({
        savedObjectsClient,
        esClient,
        installedPkg,
        latestPkg,
        pkgToUpgrade,
      });
    } else {
      return { name: pkgToUpgrade, error: result.reason };
    }
  });
  const installResults = await Promise.allSettled(installResponsePromises);
  const installResponses = installResults.map((result, index) => {
    const pkgToUpgrade = packagesToUpgrade[index];
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { name: pkgToUpgrade, error: result.reason };
    }
  });

  return installResponses;
}

export function isBulkInstallError(test: any): test is IBulkInstallPackageError {
  return 'error' in test && test.error instanceof Error;
}
