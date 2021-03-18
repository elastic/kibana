/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { PackagePolicy } from '../../../common';

import { migrateEndpointPackagePolicyToV7130 } from './security_solution';

export const migratePackagePolicyToV7130: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  // Endpoint specific migrations
  // FIXME:PT remove `-OFF` from below once ready to be released
  if (packagePolicyDoc.attributes.package?.name === 'endpoint-OFF') {
    return migrateEndpointPackagePolicyToV7130(packagePolicyDoc, migrationContext);
  }

  return packagePolicyDoc;
};
