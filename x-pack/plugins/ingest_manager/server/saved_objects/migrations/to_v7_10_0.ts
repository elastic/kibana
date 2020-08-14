/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { Agent, AgentEvent, AgentPolicy, PackagePolicy, EnrollmentAPIKey } from '../../types';

export const migrateAgentToV7100: SavedObjectMigrationFn<
  Exclude<Agent, 'policy_id' | 'policy_revision'> & {
    policy_id?: string;
    policy_revision?: number | null;
  },
  Agent
> = (agentDoc) => {
  agentDoc.attributes.policy_id = agentDoc.attributes.policy_id;
  delete agentDoc.attributes.policy_id;

  agentDoc.attributes.policy_revision = agentDoc.attributes.policy_revision;
  delete agentDoc.attributes.policy_revision;

  return agentDoc;
};

export const migrateAgentEventToV7100: SavedObjectMigrationFn<
  Exclude<AgentEvent, 'policy_id'> & {
    policy_id?: string;
  },
  AgentEvent
> = (agentEventDoc) => {
  agentEventDoc.attributes.policy_id = agentEventDoc.attributes.policy_id;
  delete agentEventDoc.attributes.policy_id;

  return agentEventDoc;
};

export const migrateAgentPolicyToV7100: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'package_policies'> & {
    package_configs: string[] | PackagePolicy[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.package_policies = agentPolicyDoc.attributes.package_configs;
  delete agentPolicyDoc.attributes.package_configs;

  return agentPolicyDoc;
};

export const migrateEnrollmentApiKeysToV7100: SavedObjectMigrationFn<
  Exclude<EnrollmentAPIKey, 'policy_id'> & {
    policy_id?: string;
  },
  EnrollmentAPIKey
> = (enrollmentApiKeyDoc) => {
  enrollmentApiKeyDoc.attributes.policy_id = enrollmentApiKeyDoc.attributes.policy_id;
  delete enrollmentApiKeyDoc.attributes.policy_id;

  return enrollmentApiKeyDoc;
};

export const migratePackagePolicyToV7100: SavedObjectMigrationFn<
  Exclude<PackagePolicy, 'policy_id'> & {
    policy_id: string;
  },
  PackagePolicy
> = (packagePolicyDoc) => {
  packagePolicyDoc.attributes.policy_id = packagePolicyDoc.attributes.policy_id;
  delete packagePolicyDoc.attributes.policy_id;

  return packagePolicyDoc;
};
