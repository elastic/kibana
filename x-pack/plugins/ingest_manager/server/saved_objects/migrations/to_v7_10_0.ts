/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { Agent, AgentPolicy, PackagePolicy } from '../../types';

export const migrateAgentToV7100: SavedObjectMigrationFn<
  Exclude<Agent, 'policy_id' | 'policy_revision'> & {
    config_id?: string;
    policy_revision?: number | null;
  },
  Agent
> = (agentDoc) => {
  const updatedAgentDoc = cloneDeep(agentDoc);

  updatedAgentDoc.attributes.policy_id = agentDoc.attributes.config_id;
  delete updatedAgentDoc.attributes.config_id;

  updatedAgentDoc.attributes.policy_revision = agentDoc.attributes.policy_revision;
  delete updatedAgentDoc.attributes.policy_revision;

  return updatedAgentDoc;
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
