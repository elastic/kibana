/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { METRICS_INDICES } from './constants';
import { ListResult, PackagePolicy } from '../../../fleet/common';
import { ElasticsearchClient } from '../../../../../src/core/server';

export function getBeatMetrics(esClient: ElasticsearchClient) {
  return esClient.search({
    body: {
      size: 0,
      aggs: {
        lastDay: {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-24h',
                lte: 'now',
              },
            },
          },
          aggs: {
            latest: {
              top_hits: {
                sort: [
                  {
                    '@timestamp': {
                      order: 'desc',
                    },
                  },
                ],
                size: 1,
              },
            },
            max_rss: {
              max: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            avg_rss: {
              avg: {
                field: 'monitoring.metrics.beat.memstats.rss',
              },
            },
            max_cpu: {
              max: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
            avg_cpu: {
              avg: {
                field: 'monitoring.metrics.beat.cpu.total.time.ms',
              },
            },
          },
        },
      },
    },
    index: METRICS_INDICES,
  });
}

export function getAgentQueryMetrics(
  esClient: ElasticsearchClient,
  packagePolicies: ListResult<PackagePolicy>
) {
  return esClient.search({
    body: {
      size: 0,
      aggs: {
        policied: {
          filter: {
            terms: {
              policy_id: packagePolicies.items.map((p) => p.policy_id),
            },
          },
        },
      },
    },
    index: '.fleet-agents',
  });
}

export function getLiveQueryMetrics(esClient: ElasticsearchClient) {
  return esClient.search({
    body: {
      size: 0,
      aggs: {
        queries: {
          filter: {
            term: {
              input_type: 'osquery',
            },
          },
        },
      },
    },
    index: '.fleet-actions',
  });
}

export async function runQuery(queryFunc: () => ReturnType<ElasticsearchClient['search']>) {
  try {
    return await queryFunc();
  } catch (e) {
    return metricQueryStub;
  }
}

export const metricQueryStub: { body: { aggregations: undefined } } = {
  body: { aggregations: undefined },
};
