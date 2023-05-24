/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { AgentPolicy } from '../../types';

export const migrateAgentPolicyToV890: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'is_protected'>,
  AgentPolicy
> = (agentPolicyDoc) => {
  agentPolicyDoc.attributes.is_protected = false;

  return agentPolicyDoc;
};
