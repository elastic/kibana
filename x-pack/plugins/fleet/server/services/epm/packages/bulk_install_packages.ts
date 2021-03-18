/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { appContextService } from '../../app_context';
import * as Registry from '../registry';
import { installIndexPatterns } from '../kibana/index_pattern/install';

import { installPackage } from './install';
import type { BulkInstallResponse, IBulkInstallPackageError } from './install';

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToInstall: string[];
  esClient: ElasticsearchClient;
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToInstall,
  esClient,
}: BulkInstallPackagesParams): Promise<BulkInstallResponse[]> {
  const logger = appContextService.getLogger();
  const installSource = 'registry';
  const latestPackagesResults = await Promise.allSettled(
    packagesToInstall.map((packageName) => Registry.fetchFindLatestPackage(packageName))
  );

  logger.debug(`kicking off bulk install of ${packagesToInstall.join(', ')} from registry`);
  const installResults = await Promise.allSettled(
    latestPackagesResults.map(async (result, index) => {
      const packageName = packagesToInstall[index];
      if (result.status === 'fulfilled') {
        const latestPackage = result.value;
        return {
          name: packageName,
          version: latestPackage.version,
          result: await installPackage({
            savedObjectsClient,
            esClient,
            pkgkey: Registry.pkgToPkgKey(latestPackage),
            installSource,
            skipPostInstall: true,
          }),
        };
      }
      return { name: packageName, error: result.reason };
    })
  );

  // only install index patterns if we completed install for any package-version for the
  // first time, aka fresh installs or upgrades
  if (
    installResults.find(
      (result) => result.status === 'fulfilled' && result.value.result?.status === 'installed'
    )
  ) {
    await installIndexPatterns({ savedObjectsClient, esClient, installSource });
  }

  return installResults.map((result, index) => {
    const packageName = packagesToInstall[index];
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
