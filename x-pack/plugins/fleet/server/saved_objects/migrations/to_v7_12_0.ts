/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from 'kibana/server';

import type { AgentPolicy } from '../../types';

export { migratePackagePolicyToV7120 } from './security_solution/to_v7_12_0';

export const migrateAgentPolicyToV7120: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'is_managed' & 'is_default_fleet_server'>,
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.is_managed = false;
  agentPolicyDoc.attributes.is_default_fleet_server = false;

  return agentPolicyDoc;
};
