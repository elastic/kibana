/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENTS_INDEX } from '../../../common';

/**
 * Given a list of Agent Policy IDs, an object will be returned with the agent policy id as the key
 * and the number of active agents using that agent policy.
 * @param esClient
 * @param agentPolicyIds
 */
export const getAgentCountForAgentPolicies = async (
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<Record<string, number>> => {
  if (agentPolicyIds.length === 0) {
    return {};
  }

  const searchPromise = esClient.search<
    unknown,
    Record<'agent_counts', { buckets: Array<{ key: string; doc_count: number }> }>
  >({
    index: AGENTS_INDEX,
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                active: 'true',
              },
            },
            {
              terms: {
                policy_id: agentPolicyIds,
              },
            },
          ],
        },
      },
      aggs: {
        agent_counts: {
          terms: {
            field: 'policy_id',
            size: agentPolicyIds.length,
          },
        },
      },
      size: 0,
    },
  });

  const response: Record<string, number> = agentPolicyIds.reduce<Record<string, number>>(
    (acc, agentPolicyId) => {
      acc[agentPolicyId] = 0;
      return acc;
    },
    {}
  );

  const searchResponse = await searchPromise;

  if (searchResponse.aggregations?.agent_counts.buckets) {
    const buckets = searchResponse.aggregations?.agent_counts.buckets;

    for (const { key: agentPolicyId, doc_count: count } of buckets) {
      response[agentPolicyId] = count;
    }
  }

  return response;
};
