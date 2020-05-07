/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject } from 'src/core/server';
import {
  AssetType,
  Installable,
  Installation,
  InstallationStatus,
  KibanaAssetType,
} from '../../../../common/types/models/epm';

export {
  getCategories,
  getFile,
  getInstallationObject,
  getInstallation,
  getPackageInfo,
  getPackages,
  SearchParams,
} from './get';

export { installKibanaAssets, installPackage, ensureInstalledPackage } from './install';
export { removeInstallation } from './remove';

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
        status: InstallationStatus.installed,
        savedObject,
      }
    : {
        ...from,
        status: InstallationStatus.notInstalled,
      };
}
