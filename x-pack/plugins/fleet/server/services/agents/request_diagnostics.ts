/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { createAgentAction } from './actions';

export async function requestDiagnostics(esClient: ElasticsearchClient, agentId: string) {
  await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'REQUEST_DIAGNOSTICS',
  });
}
