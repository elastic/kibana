/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Installation, PackagePolicy } from '../../../common';
import {
  FLEET_ELASTIC_AGENT_PACKAGE,
  FLEET_SERVER_PACKAGE,
  FLEET_SYSTEM_PACKAGE,
} from '../../../common';
import { PRECONFIGURATION_LATEST_KEYWORD } from '../../constants';

import { migratePackagePolicyToV7160 as SecSolMigratePackagePolicyToV7160 } from './security_solution';

export const migrateInstallationToV7160: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc,
  migrationContext
) => {
  const updatedInstallationDoc = installationDoc;

  const DEFAULT_PACKAGES = [
    FLEET_SYSTEM_PACKAGE,
    FLEET_ELASTIC_AGENT_PACKAGE,
    FLEET_SERVER_PACKAGE,
  ].map((name) => ({
    name,
    version: PRECONFIGURATION_LATEST_KEYWORD,
  }));

  if (DEFAULT_PACKAGES.some((pkg) => pkg.name === updatedInstallationDoc.attributes.name)) {
    updatedInstallationDoc.attributes.keep_policies_up_to_date = true;
  }

  return updatedInstallationDoc;
};

export const migratePackagePolicyToV7160: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV7160(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
