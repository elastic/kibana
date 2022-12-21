/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy, Installation } from '../../../common';

import { migrateEndpointPackagePolicyToV7140 } from './security_solution';

export const migratePackagePolicyToV7140: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = migrateEndpointPackagePolicyToV7140(
      packagePolicyDoc,
      migrationContext
    );
  }

  return updatedPackagePolicyDoc;
};

export const migrateInstallationToV7140: SavedObjectMigrationFn<Installation, Installation> = (
  doc
) => {
  // Fix a missing migration for user that used Fleet before 7.9
  if (!doc.attributes.install_source) {
    doc.attributes.install_source = 'registry';
  }
  if (!doc.attributes.install_version) {
    doc.attributes.install_version = doc.attributes.version;
  }

  return doc;
};
