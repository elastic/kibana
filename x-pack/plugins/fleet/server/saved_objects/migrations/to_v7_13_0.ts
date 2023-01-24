/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { Settings } from '../../types';

import type { Output, PackagePolicy } from '../../../common';

import { migrateEndpointPackagePolicyToV7130 } from './security_solution';

export const migrateSettingsToV7130: SavedObjectMigrationFn<
  Settings & {
    package_auto_upgrade: string;
    agent_auto_upgrade: string;
    kibana_urls: string;
  },
  Settings
> = (settingsDoc) => {
  // @ts-expect-error
  delete settingsDoc.attributes.package_auto_upgrade;
  // @ts-expect-error
  delete settingsDoc.attributes.agent_auto_upgrade;
  // @ts-expect-error
  delete settingsDoc.attributes.kibana_urls;
  // @ts-expect-error
  delete settingsDoc.attributes.kibana_ca_sha256;

  return settingsDoc;
};

export const migrateOutputToV7130: SavedObjectMigrationFn<
  Output & {
    fleet_enroll_password: string;
    fleet_enroll_username: string;
  },
  Output
> = (outputDoc) => {
  // @ts-expect-error
  delete outputDoc.attributes.fleet_enroll_password;
  // @ts-expect-error
  delete outputDoc.attributes.fleet_enroll_username;

  return outputDoc;
};

export const migratePackagePolicyToV7130: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = migrateEndpointPackagePolicyToV7130(
      packagePolicyDoc,
      migrationContext
    );
  }

  return updatedPackagePolicyDoc;
};
