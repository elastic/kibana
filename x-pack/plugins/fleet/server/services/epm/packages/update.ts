/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from 'kibana/server';
import type { TypeOf } from '@kbn/config-schema';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import type { Installation, UpdatePackageRequestSchema } from '../../../types';
import { IngestManagerError } from '../../../errors';

import { getInstallationObject, getPackageInfo } from './get';

export async function updatePackage(
  options: {
    savedObjectsRepo: ISavedObjectsRepository;
    pkgName: string;
    keepPoliciesUpToDate?: boolean;
  } & TypeOf<typeof UpdatePackageRequestSchema.body>
) {
  const { savedObjectsRepo, pkgName, keepPoliciesUpToDate } = options;
  const installedPackage = await getInstallationObject({ savedObjectsRepo, pkgName });

  if (!installedPackage) {
    throw new IngestManagerError(`package ${pkgName} is not installed`);
  }

  await savedObjectsRepo.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, installedPackage.id, {
    keep_policies_up_to_date: keepPoliciesUpToDate ?? false,
  });

  const packageInfo = await getPackageInfo({
    savedObjectsRepo,
    pkgName,
    pkgVersion: installedPackage.attributes.version,
  });

  return packageInfo;
}
