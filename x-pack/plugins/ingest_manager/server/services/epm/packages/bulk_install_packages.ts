/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { CallESAsCurrentUser } from '../../../types';
import * as Registry from '../registry';
import {
  BulkInstallResponse,
  getInstallationObject,
  IBulkInstallPackageError,
  upgradePackage,
} from './index';

interface BulkInstallPackagesParams {
  savedObjectsClient: SavedObjectsClientContract;
  packagesToUpgrade: string[];
  callCluster: CallESAsCurrentUser;
}

export async function bulkInstallPackages({
  savedObjectsClient,
  packagesToUpgrade,
  callCluster,
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
        callCluster,
        installedPkg,
        latestPkg,
        pkgToUpgrade,
      });
    } else {
      // this is a critical error because we weren't able to gather enough information from the saved objects
      // and remote registry to determine if this is just a regular install or an upgrade
      return { name: pkgToUpgrade, error: result.reason, criticalFailure: true };
    }
  });
  const installResults = await Promise.allSettled(installResponsePromises);
  const installResponses = installResults.map((result, index) => {
    const pkgToUpgrade = packagesToUpgrade[index];
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // this is a critical error because the `upgradePackage` call threw an error when it should not have
      return { name: pkgToUpgrade, error: result.reason, criticalFailure: true };
    }
  });

  return installResponses;
}

export function isBulkInstallError(test: any): test is IBulkInstallPackageError {
  return 'error' in test && test.error instanceof Error;
}

/**
 * This functions determines if the response from the bulk install call is a failure from installing
 * a package (meaning the package was not present previously) or the upgrade of a package failed and was
 * unable to roll the package back to the previous state.
 *
 * @param resp the bulk install call response object
 */
export function isCriticalInstallError(
  resp: BulkInstallResponse
): resp is IBulkInstallPackageError {
  return isBulkInstallError(resp) && resp.criticalFailure;
}
