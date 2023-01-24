/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { PackagePolicy } from '../../../common';
import type { Installation } from '../../../common';

import type { AgentPolicy } from '../../types';

import { migratePackagePolicyToV840 as SecSolMigratePackagePolicyToV840 } from './security_solution';

export const migrateInstallationToV840: SavedObjectMigrationFn<Installation, Installation> = (
  installationDoc
) => {
  installationDoc.attributes.verification_status = 'unknown';

  return installationDoc;
};

export const migrateAgentPolicyToV840: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'download_source_id'> & {
    config_id: string;
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.download_source_id = agentPolicyDoc.attributes.config_id;
  // @ts-expect-error
  delete agentPolicyDoc.attributes.config_id;

  return agentPolicyDoc;
};

export const migratePackagePolicyToV840: SavedObjectMigrationFn<PackagePolicy, PackagePolicy> = (
  packagePolicyDoc,
  migrationContext
) => {
  let updatedPackagePolicyDoc = packagePolicyDoc;

  // Endpoint specific migrations
  if (packagePolicyDoc.attributes.package?.name === 'endpoint') {
    updatedPackagePolicyDoc = SecSolMigratePackagePolicyToV840(packagePolicyDoc, migrationContext);
  }

  return updatedPackagePolicyDoc;
};
