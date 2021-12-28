/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsFiltersAggregate, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from 'src/core/server';
import { AGENT_LOGS_INDEX } from '../../../common/constants';

const getAgentLogsEsQuery = (): SearchRequest => ({
  index: AGENT_LOGS_INDEX,
  size: 0,
  //   query: {
  //     bool: {
  //       filter: [
  //         { term: { 'event_status.keyword': 'end' } }, // TODO: commment out when updateing agent to dend logs
  //       ],
  //     },
  //   },
  aggs: {
    group: {
      terms: { field: 'agent.id.keyword' },
      aggs: {
        group_docs: {
          top_hits: {
            size: 1,
            sort: [{ '@timestamp': { order: 'desc' } }],
          },
        },
      },
    },
  },
  fields: ['run_id.keyword', 'agent.id.keyword'],
  _source: false,
});

const getCycleId = (v: any): string => v.group_docs.hits.hits?.[0]?.fields['run_id.keyword'][0];

export const getLatestCycleIds = async (
  esClient: ElasticsearchClient
): Promise<string[] | undefined> => {
  try {
    const agentLogs = await esClient.search(getAgentLogsEsQuery());
    const aggregations = agentLogs.body.aggregations;
    if (!aggregations) {
      return;
    }
    const buckets = (aggregations.group as Record<string, AggregationsFiltersAggregate>).buckets;
    if (!Array.isArray(buckets)) {
      return;
    }
    return buckets.map(getCycleId);
  } catch (err) {
    // TODO: return meaningful error message
    return;
  }
};
