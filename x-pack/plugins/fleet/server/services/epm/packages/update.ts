/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type { Installation, UpdatePackageRequestSchema } from '../../../types';
import { IngestManagerError } from '../../../errors';

import { getInstallationObject, getPackageInfo } from './get';

export async function updatePackage(
  options: {
    savedObjectsClient: SavedObjectsClientContract;
    pkgName: string;
    keepPoliciesUpToDate?: boolean;
  } & TypeOf<typeof UpdatePackageRequestSchema.body>
) {
  const { savedObjectsClient, pkgName, keepPoliciesUpToDate } = options;
  const installedPackage = await getInstallationObject({ savedObjectsClient, pkgName });

  if (!installedPackage) {
    throw new IngestManagerError(`package ${pkgName} is not installed`);
  }

  await savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, installedPackage.id, {
    keep_policies_up_to_date: keepPoliciesUpToDate ?? false,
  });

  const packageInfo = await getPackageInfo({
    savedObjectsClient,
    pkgName,
    pkgVersion: installedPackage.attributes.version,
  });

  return packageInfo;
}
