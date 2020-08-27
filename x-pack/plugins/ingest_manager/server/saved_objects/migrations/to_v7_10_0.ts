/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { Agent, AgentEvent, AgentPolicy, PackagePolicy, EnrollmentAPIKey } from '../../types';

export const migrateAgentToV7100: SavedObjectMigrationFn<
  Exclude<Agent, 'policy_id' | 'policy_revision'> & {
    config_id?: string;
    config_revision?: number | null;
  },
  Agent
> = (agentDoc) => {
  agentDoc.attributes.policy_id = agentDoc.attributes.config_id;
  delete agentDoc.attributes.config_id;

  agentDoc.attributes.policy_revision = agentDoc.attributes.config_revision;
  delete agentDoc.attributes.config_revision;

  return agentDoc;
};

export const migrateAgentEventToV7100: SavedObjectMigrationFn<
  Exclude<AgentEvent, 'policy_id'> & {
    config_id?: string;
  },
  AgentEvent
> = (agentEventDoc) => {
  agentEventDoc.attributes.policy_id = agentEventDoc.attributes.config_id;
  delete agentEventDoc.attributes.config_id;

  return agentEventDoc;
};

export const migrateAgentPolicyToV7100: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'package_policies'> & {
    package_configs: string[] | PackagePolicy[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.package_policies = agentPolicyDoc.attributes.package_configs;
  // @ts-expect-error
  delete agentPolicyDoc.attributes.package_configs;

  return agentPolicyDoc;
};

export const migrateEnrollmentApiKeysToV7100: SavedObjectMigrationFn<
  Exclude<EnrollmentAPIKey, 'policy_id'> & {
    config_id?: string;
  },
  EnrollmentAPIKey
> = (enrollmentApiKeyDoc) => {
  enrollmentApiKeyDoc.attributes.policy_id = enrollmentApiKeyDoc.attributes.config_id;
  delete enrollmentApiKeyDoc.attributes.config_id;

  return enrollmentApiKeyDoc;
};

export const migratePackagePolicyToV7100: SavedObjectMigrationFn<
  Exclude<PackagePolicy, 'policy_id'> & {
    config_id: string;
  },
  PackagePolicy
> = (packagePolicyDoc) => {
  packagePolicyDoc.attributes.policy_id = packagePolicyDoc.attributes.config_id;
  // @ts-expect-error
  delete packagePolicyDoc.attributes.config_id;

  return packagePolicyDoc;
};
