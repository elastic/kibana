/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { cloneDeep } from 'lodash';
import { Agent } from '../../types';

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
