/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { AGENT_POLICY_INDEX } from '../../common';
import { ES_SEARCH_LIMIT } from '../../common/constants';
import { appContextService } from '../services';

export interface AgentPoliciesUsage {
  count: number;
  output_types: string[];
}

interface AgentPoliciesUsageAggs {
  unique_policies: {
    buckets: Array<{
      key: string;
      output_types: {
        hits: {
          hits: Array<{
            _source: {
              data?: {
                outputs?: {
                  [key: string]: {
                    type: string;
                  };
                };
              };
            };
          }>;
        };
      };
    }>;
  };
}

const DEFAULT_AGENT_POLICIES_USAGE = {
  count: 0,
  output_types: [],
};

export const getAgentPoliciesUsage = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<AgentPoliciesUsage> => {
  const res = await esClient.search<{}, AgentPoliciesUsageAggs>(
    {
      index: AGENT_POLICY_INDEX,
      size: 0,
      ignore_unavailable: true,
      aggregations: {
        unique_policies: {
          terms: {
            field: 'policy_id',
            size: ES_SEARCH_LIMIT,
          },
          aggregations: {
            output_types: {
              top_hits: {
                size: 1,
                sort: {
                  revision_idx: 'desc',
                },
                _source: ['data.outputs.*.type'],
              },
            },
          },
        },
      },
    },
    { signal: abortController.signal }
  );

  const agentPolicyCount = res?.aggregations?.unique_policies?.buckets?.length ?? 0;

  if (agentPolicyCount === 0) {
    return DEFAULT_AGENT_POLICIES_USAGE;
  }

  const allOutputs = res.aggregations!.unique_policies.buckets.flatMap((bucket) =>
    bucket.output_types.hits.hits.flatMap((hit) => Object.values(hit._source?.data?.outputs || {}))
  );

  const uniqueOutputs = new Set(allOutputs.flatMap((output) => output.type));

  return {
    count: agentPolicyCount as number,
    output_types: Array.from(uniqueOutputs),
  };
};
