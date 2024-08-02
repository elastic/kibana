/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectModelDataBackfillFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../common';

// backfill existing package policies with packages requiring root in 8.15.0
const ROOT_PACKAGES = [
  'endpoint',
  'universal_profiling_agent',
  'system_audit',
  'network_traffic',
  'fim',
  'auditd_manager',
];

export const migratePackagePolicySetRequiresRootToV8150: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  if (
    updatedPackagePolicyDoc.attributes.package &&
    ROOT_PACKAGES.includes(updatedPackagePolicyDoc.attributes.package.name)
  ) {
    updatedPackagePolicyDoc.attributes.package.requires_root = true;
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};

export const migratePackagePolicyIdsToV8150: SavedObjectModelDataBackfillFn<
  PackagePolicy,
  PackagePolicy
> = (packagePolicyDoc) => {
  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> = packagePolicyDoc;

  if (updatedPackagePolicyDoc.attributes.policy_id) {
    updatedPackagePolicyDoc.attributes.policy_ids = [updatedPackagePolicyDoc.attributes.policy_id];
  }

  return { attributes: updatedPackagePolicyDoc.attributes };
};
