/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import type { Agent } from '../../types';

export async function fetchAndAssignAgentMetrics(esClient: ElasticsearchClient, agents: Agent[]) {
  const res = await esClient.search<
    unknown,
    Record<
      'agents',
      {
        buckets: Array<{
          key: string;
          sum_memory_size: { value: number };
          sum_cpu: { value: number };
        }>;
      }
    >
  >({
    ...(aggregationQueryBuilder(agents.map(({ id }) => id)) as any),
    index: 'metrics-elastic_agent.*',
  });

  const formattedResults =
    res.aggregations?.agents.buckets.reduce((acc, bucket) => {
      acc[bucket.key] = {
        sum_memory_size: bucket.sum_memory_size.value,
        sum_cpu: bucket.sum_cpu.value,
      };
      return acc;
    }, {} as Record<string, { sum_memory_size: number; sum_cpu: number }>) ?? {};

  return agents.map((agent) => {
    const results = formattedResults[agent.id];

    return {
      ...agent,
      metrics: {
        cpu_avg: results?.sum_cpu ? Math.trunc(results.sum_cpu * 10000) / 100 : undefined,
        memory_size_byte_avg: results?.sum_memory_size
          ? Math.trunc(results?.sum_memory_size)
          : undefined,
      },
    };
  });

  return agents;
}

const aggregationQueryBuilder = (agentIds: string[]) => ({
  size: 0,
  query: {
    bool: {
      must: [
        {
          range: {
            '@timestamp': {
              gte: 'now-5m',
            },
          },
        },
        {
          terms: {
            'elastic_agent.id': agentIds,
          },
        },
        {
          bool: {
            filter: [
              {
                bool: {
                  should: [
                    {
                      term: {
                        'data_stream.dataset': 'elastic_agent.elastic_agent',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
  aggs: {
    agents: {
      terms: {
        field: 'elastic_agent.id',
      },
      aggs: {
        sum_memory_size: {
          sum_bucket: {
            buckets_path: 'processes>avg_memory_size',
          },
        },
        sum_cpu: {
          sum_bucket: {
            buckets_path: 'processes>avg_cpu',
          },
        },
        processes: {
          terms: {
            field: 'elastic_agent.process',
            order: {
              _count: 'desc',
            },
          },
          aggs: {
            avg_cpu: {
              avg_bucket: {
                buckets_path: 'cpu_time_series>cpu',
              },
            },
            avg_memory_size: {
              avg: {
                field: 'system.process.memory.size',
              },
            },
            cpu_time_series: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: 'minute',
              },
              aggs: {
                max_cpu: {
                  max: {
                    field: 'system.process.cpu.total.value',
                  },
                },
                cpu_derivative: {
                  derivative: {
                    buckets_path: 'max_cpu',
                    gap_policy: 'skip',
                    unit: '10s',
                  },
                },
                cpu: {
                  bucket_script: {
                    buckets_path: {
                      cpu_total: 'cpu_derivative[normalized_value]',
                    },
                    script: {
                      source: `if (params.cpu_total > 0) {
                      return params.cpu_total / params._interval  
                    }
                    `,
                      lang: 'painless',
                      params: {
                        _interval: 10000,
                      },
                    },
                    gap_policy: 'skip',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});
