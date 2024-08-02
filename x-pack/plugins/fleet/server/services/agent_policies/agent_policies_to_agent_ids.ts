/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import { AGENTS_INDEX } from '../../../common';

/**
 * Given a list of Agent Policy IDs, an array will be returned with
 * the ids of the agents using that agent policy.
 * @param esClient
 * @param agentPolicyIds
 */
export const getAgentIdsForAgentPolicies = async (
  esClient: ElasticsearchClient,
  agentPolicyIds: string[]
): Promise<string[]> => {
  if (agentPolicyIds.length === 0) {
    return [];
  }

  const res = await esClient.search({
    index: AGENTS_INDEX,
    ignore_unavailable: true,
    size: 100, // TODO: check if reasonable value
    _source: false,
    body: {
      query: {
        bool: {
          filter: [
            {
              terms: {
                policy_id: agentPolicyIds,
              },
            },
          ],
        },
      },
    },
  });

  return res.hits.hits.map((hit) => hit._id!);
};
