/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationFn } from '@kbn/core/server';

import type { AgentPolicy } from '../../types';

export const migrateAgentPolicyToV850: SavedObjectMigrationFn<
  Exclude<AgentPolicy, 'download_source_id'> & {
    package_policies: string[];
  },
  AgentPolicy
> = (agentPolicyDoc) => {
  // @ts-expect-error
  delete agentPolicyDoc.attributes.package_policies;

  return agentPolicyDoc;
};
