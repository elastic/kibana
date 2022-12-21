/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn, SavedObjectUnsanitizedDoc } from '@kbn/core/server';
import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

export const migratePackagePolicyToV840: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc
) => {
  if (packagePolicyDoc.attributes.package?.name !== 'endpoint') {
    return packagePolicyDoc;
  }

  const updatedPackagePolicyDoc: SavedObjectUnsanitizedDoc<PackagePolicy> =
    cloneDeep(packagePolicyDoc);

  const input = updatedPackagePolicyDoc.attributes.inputs[0];

  if (input && input.config) {
    const policy = input.config.policy.value;

    const migratedAdvancedPolicy = { fanotify: { ignore_unknown_filesystems: false } };
    const migratedAttackSurfaceReductionPolicy = { credential_hardening: { enabled: false } };

    policy.linux.advanced = policy.linux.advanced
      ? { ...policy.linux.advanced, ...migratedAdvancedPolicy }
      : { ...migratedAdvancedPolicy };

    policy.windows.attack_surface_reduction = migratedAttackSurfaceReductionPolicy;
  }

  return updatedPackagePolicyDoc;
};
