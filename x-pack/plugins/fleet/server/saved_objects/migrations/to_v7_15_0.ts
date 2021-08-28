/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SavedObjectMigrationFn } from '../../../../../../src/core/server/saved_objects/migrations/types';
import type { PackagePolicy } from '../../../common/types/models/package_policy';

import { migratePackagePolicyToV7150 as SecSolMigratePackagePolicyToV7150 } from './security_solution/to_v7_15_0';

export const migratePackagePolicyToV7150: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV7150(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
