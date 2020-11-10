/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server';
import {
  RequiredPackage,
  requiredPackages,
  ValueOf,
  installationStatuses,
} from '../../../../common';
import { AssetType, Installable, Installation, KibanaAssetType } from '../../../types';

export { bulkInstallPackages, isBulkInstallError } from './bulk_install_packages';
export {
  getCategories,
  getFile,
  getInstallationObject,
  getInstallation,
  getPackageInfo,
  getPackages,
  getLimitedPackages,
  SearchParams,
} from './get';

export {
  BulkInstallResponse,
  IBulkInstallPackageError,
  handleInstallPackageFailure,
  installPackageFromRegistry,
  installPackageByUpload,
  ensureInstalledPackage,
} from './install';
export { removeInstallation } from './remove';

export function isRequiredPackage(value: string): value is ValueOf<RequiredPackage> {
  return Object.values(requiredPackages).some((required) => value === required);
}

export class PackageNotInstalledError extends Error {
  constructor(pkgkey: string) {
    super(`${pkgkey} is not installed`);
  }
}

// only Kibana Assets use Saved Objects at this point
export const savedObjectTypes: AssetType[] = Object.values(KibanaAssetType);

export function createInstallableFrom<T>(
  from: T,
  savedObject?: SavedObject<Installation>
): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: installationStatuses.Installed,
        savedObject,
      }
    : {
        ...from,
        status: installationStatuses.NotInstalled,
      };
}
