/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';
import type { Agent, AgentPolicy } from '../../types';

export const migrateAgentToV7120: SavedObjectMigrationFn<Agent & { shared_id?: string }, Agent> = (
  agentDoc
) => {
  delete agentDoc.attributes.shared_id;

  return agentDoc;
};

export const migrateAgentPolicyToV7120: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'is_managed'>,
  AgentPolicy
> = (agentPolicyDoc) => {
  const isV12 = 'is_managed' in agentPolicyDoc.attributes;
  if (!isV12) {
    agentPolicyDoc.attributes.is_managed = false;
  }
  return agentPolicyDoc;
};
