/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';

import { installationStatuses, KibanaSavedObjectType } from '../../../../common';
import { KibanaAssetType } from '../../../types';
import type { AssetType, Installable, Installation } from '../../../types';

export { bulkInstallPackages, isBulkInstallError } from './bulk_install_packages';
export type { SearchParams } from './get';
export {
  getCategories,
  getFile,
  getInstallationObject,
  getInstallation,
  getInstallations,
  getPackageInfo,
  getPackageInfoFromRegistry,
  getPackages,
  getLimitedPackages,
} from './get';

export { getBundledPackages } from './bundled_packages';

export type { BulkInstallResponse, IBulkInstallPackageError } from './install';
export { handleInstallPackageFailure, installPackage, ensureInstalledPackage } from './install';
export { removeInstallation } from './remove';

export class PackageNotInstalledError extends Error {
  constructor(pkgkey: string) {
    super(`${pkgkey} is not installed`);
  }
}

// only Kibana Assets use Saved Objects at this point
export const savedObjectTypes: AssetType[] = Object.values(KibanaAssetType);
export const kibanaSavedObjectTypes: KibanaSavedObjectType[] = Object.values(KibanaSavedObjectType);
export function createInstallableFrom<T>(
  from: T,
  savedObject?: SavedObject<Installation>
): Installable<T> {
  return savedObject
    ? {
        ...from,
        status: savedObject.attributes.install_status,
        savedObject,
      }
    : {
        ...from,
        status: installationStatuses.NotInstalled,
      };
}
