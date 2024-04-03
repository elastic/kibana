/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';

import type { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';

import { SO_SEARCH_LIMIT } from '../../constants';

import type { GetAgentsOptions } from '.';
import { getAgents, getAgentsByKuery } from './crud';
import { createAgentAction } from './actions';
import { openPointInTime } from './crud';
import {
  RequestDiagnosticsActionRunner,
  requestDiagnosticsBatch,
} from './request_diagnostics_action_runner';

const REQUEST_DIAGNOSTICS_TIMEOUT_MS = 3 * 60 * 1000; // 3 hours;

export async function requestDiagnostics(
  esClient: ElasticsearchClient,
  agentId: string,
  additionalMetrics?: RequestDiagnosticsAdditionalMetrics[]
): Promise<{ actionId: string }> {
  const response = await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'REQUEST_DIAGNOSTICS',
    expiration: new Date(Date.now() + REQUEST_DIAGNOSTICS_TIMEOUT_MS).toISOString(),
    data: {
      additional_metrics: additionalMetrics,
    },
  });
  return { actionId: response.id };
}

export async function bulkRequestDiagnostics(
  esClient: ElasticsearchClient,
  soClient: SavedObjectsClientContract,
  options: GetAgentsOptions & {
    batchSize?: number;
    additionalMetrics?: RequestDiagnosticsAdditionalMetrics[];
  }
): Promise<{ actionId: string }> {
  if ('agentIds' in options) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await requestDiagnosticsBatch(esClient, givenAgents, {
      additionalMetrics: options.additionalMetrics,
    });
  }

  const batchSize = options.batchSize ?? SO_SEARCH_LIMIT;
  const res = await getAgentsByKuery(esClient, soClient, {
    kuery: options.kuery,
    showInactive: false,
    page: 1,
    perPage: batchSize,
  });
  if (res.total <= batchSize) {
    const givenAgents = await getAgents(esClient, soClient, options);
    return await requestDiagnosticsBatch(esClient, givenAgents, {
      additionalMetrics: options.additionalMetrics,
    });
  } else {
    return await new RequestDiagnosticsActionRunner(
      esClient,
      soClient,
      {
        ...options,
        batchSize,
        total: res.total,
      },
      { pitId: await openPointInTime(esClient) }
    ).runActionAsyncWithRetry();
  }
}
