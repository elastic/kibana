/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { AGENT_POLICY_INDEX } from '../../common';
import { ES_SEARCH_LIMIT } from '../../common/constants';

export const getAgentPoliciesUsage = async (
  esClient: ElasticsearchClient,
  abortController: AbortController
): Promise<any> => {
  const res = await esClient.search(
    {
      index: AGENT_POLICY_INDEX,
      size: ES_SEARCH_LIMIT,
      track_total_hits: true,
      rest_total_hits_as_int: true,
    },
    { signal: abortController.signal }
  );

  const agentPolicies = res.hits.hits;

  const outputTypes = new Set<string>();
  agentPolicies.forEach((item) => {
    const source = (item._source as any) ?? {};
    Object.keys(source.data.outputs).forEach((output) => {
      outputTypes.add(source.data.outputs[output].type);
    });
  });

  return {
    count: res.hits.total,
    output_types: Array.from(outputTypes),
  };
};
