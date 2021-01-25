/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationFn } from 'kibana/server';
import { Agent } from '../../types';

export const migrateAgentToV7120: SavedObjectMigrationFn<Agent & { shared_id?: string }, Agent> = (
  agentDoc
) => {
  delete agentDoc.attributes.shared_id;

  return agentDoc;
};
