/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy } from '../../../common';

import { migratePackagePolicyToV820 as SecSolMigratePackagePolicyToV820 } from './security_solution';

export const migratePackagePolicyToV820: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV820(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
