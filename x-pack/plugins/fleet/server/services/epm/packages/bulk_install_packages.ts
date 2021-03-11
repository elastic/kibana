/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import * as Registry from '../registry';

import { installPackage } from './install';
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
  const latestPackagesResults = await Promise.allSettled(
    packagesToUpgrade.map((packageName) => Registry.fetchFindLatestPackage(packageName))
  );

  const installResults = await Promise.allSettled(
    latestPackagesResults.map(async (result, index) => {
      const packageName = packagesToUpgrade[index];
      if (result.status === 'fulfilled') {
        const latestPackage = result.value;
        return {
          name: packageName,
          version: latestPackage.version,
          assets: await installPackage({
            savedObjectsClient,
            esClient,
            pkgkey: Registry.pkgToPkgKey(latestPackage),
            installSource: 'registry',
          }),
        };
      }
      return { name: packageName, error: result.reason };
    })
  );

  return installResults.map((result, index) => {
    const packageName = packagesToUpgrade[index];
    return result.status === 'fulfilled'
      ? result.value
      : { name: packageName, error: result.reason };
  });
}

export function isBulkInstallError(
  installResponse: any
): installResponse is IBulkInstallPackageError {
  return 'error' in installResponse && installResponse.error instanceof Error;
}
