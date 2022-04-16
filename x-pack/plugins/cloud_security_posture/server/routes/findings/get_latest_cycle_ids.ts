/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { AggregationsFiltersAggregate, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { AGENT_LOGS_INDEX_PATTERN } from '../../../common/constants';

const getAgentLogsEsQuery = (): SearchRequest => ({
  index: AGENT_LOGS_INDEX_PATTERN,
  size: 0,
  query: {
    bool: {
      filter: [{ term: { 'status.keyword': 'end' } }],
    },
  },
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
  fields: ['cycle_id.keyword', 'agent.id.keyword'],
  _source: false,
});

const getCycleId = (v: any): string => v.group_docs.hits.hits?.[0]?.fields['cycle_id.keyword'][0];

export const getLatestCycleIds = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<string[] | undefined> => {
  try {
    const agentLogs = await esClient.search(getAgentLogsEsQuery());
    const aggregations = agentLogs.aggregations;
    if (!aggregations) {
      return;
    }
    const buckets = (aggregations.group as Record<string, AggregationsFiltersAggregate>).buckets;
    if (!Array.isArray(buckets)) {
      return;
    }

    return buckets.map(getCycleId);
  } catch (err) {
    logger.error('Failed to fetch cycle_ids');
    throw new Error('Failed to fetch cycle_ids');
  }
};
