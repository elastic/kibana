/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { AgentPolicy } from '../../types';

export const migrateAgentPolicyToV810: SavedObjectMigrationFn<AgentPolicy, AgentPolicy> = (
  agentPolicyDoc
) => {
  delete agentPolicyDoc.attributes.is_default;
  delete agentPolicyDoc.attributes.is_default_fleet_server;

  return agentPolicyDoc;
};
