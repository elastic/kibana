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
  Exclude<AgentPolicy, 'is_managed' & 'is_default_fleet_server'>,
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.is_managed = false;
  agentPolicyDoc.attributes.is_default_fleet_server = false;

  return agentPolicyDoc;
};
