/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import semver from 'semver';
import { UnwrapPromise } from '@kbn/utility-types';
import { SavedObjectsClientContract } from 'src/core/server';
import { BulkInstallPackageInfo } from '../../../../common';
import { CallESAsCurrentUser } from '../../../types';
import * as Registry from '../registry';
import {
  getInstallationObject,
  handleInstallPackageFailure,
  installPackageFromRegistry,
} from './index';

export interface IBulkInstallPackageError {
  name: string;
  error: Error;
  criticalFailure: boolean;
}
export type BulkInstallResponse = BulkInstallPackageInfo | IBulkInstallPackageError;

interface UpgradePackageParams {
  savedObjectsClient: SavedObjectsClientContract;
  callCluster: CallESAsCurrentUser;
  installedPkg: UnwrapPromise<ReturnType<typeof getInstallationObject>>;
  latestPkg: UnwrapPromise<ReturnType<typeof Registry.fetchFindLatestPackage>>;
  pkgToUpgrade: string;
}
export const upgradePackage = async ({
  savedObjectsClient,
  callCluster,
  installedPkg,
  latestPkg,
  pkgToUpgrade,
}: UpgradePackageParams): Promise<BulkInstallResponse> => {
  if (!installedPkg || semver.gt(latestPkg.version, installedPkg.attributes.version)) {
    const pkgkey = Registry.pkgToPkgKey({
      name: latestPkg.name,
      version: latestPkg.version,
    });

    try {
      const assets = await installPackageFromRegistry({ savedObjectsClient, pkgkey, callCluster });
      return {
        name: pkgToUpgrade,
        newVersion: latestPkg.version,
        oldVersion: installedPkg?.attributes.version ?? null,
        assets,
      };
    } catch (installFailed) {
      const rollbackError = await handleInstallPackageFailure({
        savedObjectsClient,
        error: installFailed,
        pkgName: latestPkg.name,
        pkgVersion: latestPkg.version,
        installedPkg,
        callCluster,
      });
      // a critical failure occurs if the failure came from a normal install (not upgrading a package) or if the upgrade
      // had a rollback error because that means the package could not be restored to its original state
      const criticalFailure =
        !isUpgrade({ installedPkg, latestPkg }) || rollbackError !== undefined;
      return {
        name: pkgToUpgrade,
        error: installFailed,
        criticalFailure,
      };
    }
  } else {
    // package was already at the latest version
    return {
      name: pkgToUpgrade,
      newVersion: latestPkg.version,
      oldVersion: latestPkg.version,
      assets: [
        ...installedPkg.attributes.installed_es,
        ...installedPkg.attributes.installed_kibana,
      ],
    };
  }
};

export function isUpgrade({
  installedPkg,
  latestPkg,
}: {
  installedPkg: UnwrapPromise<ReturnType<typeof getInstallationObject>>;
  latestPkg: UnwrapPromise<ReturnType<typeof Registry.fetchFindLatestPackage>>;
}): boolean {
  return (
    installedPkg !== undefined && semver.gt(latestPkg.version, installedPkg.attributes.version)
  );
}
