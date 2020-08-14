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
  const updatedAgentDoc = cloneDeep(agentDoc);

  updatedAgentDoc.attributes.policy_id = agentDoc.attributes.policy_id;
  delete updatedAgentDoc.attributes.policy_id;

  updatedAgentDoc.attributes.policy_revision = agentDoc.attributes.policy_revision;
  delete updatedAgentDoc.attributes.policy_revision;

  return updatedAgentDoc;
};

export const migrateAgentEventToV7100: SavedObjectMigrationFn<
  Exclude<AgentEvent, 'policy_id'> & {
    policy_id?: string;
  },
  AgentEvent
> = (agentEventDoc) => {
  const updatedAgentEventDoc = cloneDeep(agentEventDoc);

  updatedAgentEventDoc.attributes.policy_id = agentEventDoc.attributes.policy_id;
  delete updatedAgentEventDoc.attributes.policy_id;

  return updatedAgentEventDoc;
};

export const migrateAgentPolicyToV7100: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'package_policies'> & {
    package_configs: string[] | PackagePolicy[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  const updatedAgentPolicyDoc = cloneDeep(agentPolicyDoc);

  updatedAgentPolicyDoc.attributes.package_policies = agentPolicyDoc.attributes.package_configs;
  delete updatedAgentPolicyDoc.attributes.package_configs;

  return updatedAgentPolicyDoc;
};

export const migrateEnrollmentApiKeysToV7100: SavedObjectMigrationFn<
  Exclude<EnrollmentAPIKey, 'policy_id'> & {
    policy_id?: string;
  },
  EnrollmentAPIKey
> = (enrollmentApiKeyDoc) => {
  const updatedEnrollmentApiKeyDoc = cloneDeep(enrollmentApiKeyDoc);

  updatedEnrollmentApiKeyDoc.attributes.policy_id = enrollmentApiKeyDoc.attributes.policy_id;
  delete updatedEnrollmentApiKeyDoc.attributes.policy_id;

  return updatedEnrollmentApiKeyDoc;
};

export const migratePackagePolicyToV7100: SavedObjectMigrationFn<
  Exclude<PackagePolicy, 'policy_id'> & {
    policy_id: string;
  },
  PackagePolicy
> = (packagePolicyDoc) => {
  const updatedPackagePolicyDoc = cloneDeep(packagePolicyDoc);

  updatedPackagePolicyDoc.attributes.policy_id = packagePolicyDoc.attributes.policy_id;
  delete updatedPackagePolicyDoc.attributes.policy_id;

  return updatedPackagePolicyDoc;
};
