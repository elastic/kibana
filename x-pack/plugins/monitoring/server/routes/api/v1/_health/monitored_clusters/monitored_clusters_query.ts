/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '../../../../../../common/http_api/shared';
import {
  getBeatDataset,
  getElasticsearchDataset,
  getKibanaDataset,
  getLogstashDataset,
} from '../../../../../lib/cluster/get_index_patterns';

const MAX_BUCKET_SIZE = 100;

interface QueryOptions {
  timeRange?: TimeRange;
  timeout: number; // in seconds
}

/**
 * returns a nested aggregation of the monitored products per cluster, standalone
 * included. each product aggregation retrieves the related metricsets and the
 * last time they were ingested.
 * if a product requires multiple aggregations the key is suffixed with an identifer
 * separated by an underscore. eg beats_state
 */
export const monitoredClustersQuery = ({ timeRange, timeout }: QueryOptions) => {
  if (!timeRange) throw new Error('monitoredClustersQuery: missing timeRange parameter');

  return {
    timeout: `${timeout}s`,
    query: {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: timeRange.min,
                lte: timeRange.max,
              },
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: clusterUuidTerm,
        aggs: {
          ...beatsAggregations,
          cluster: clusterAggregation,
          elasticsearch: esAggregation,
          kibana: kibanaAggregation,
          logstash: logstashAggregation,
        },
      },
    },
  };
};

/**
 * some metricset documents use a stable ID to maintain a single occurrence of
 * the documents in the index. we query those metricsets separately without
 * a time range filter
 */
export const persistentMetricsetsQuery = ({ timeout }: QueryOptions) => {
  const shardMatches = [
    {
      term: {
        type: 'shards',
      },
    },
    {
      term: {
        'metricset.name': 'shard',
      },
    },
    {
      term: {
        'data_stream.dataset': getElasticsearchDataset('shard'),
      },
    },
  ];

  const logstashStateMatches = [
    {
      term: {
        type: 'logstash_state',
      },
    },
    {
      term: {
        'metricset.name': 'node',
      },
    },
    {
      term: {
        'data_stream.dataset': getLogstashDataset('node'),
      },
    },
  ];

  const metricsetsAggregations = {
    elasticsearch: {
      terms: {
        field: 'source_node.uuid',
        size: MAX_BUCKET_SIZE,
      },
      aggs: {
        shard: lastSeenByIndex({
          filter: {
            bool: {
              should: shardMatches,
            },
          },
        }),
      },
    },

    logstash: {
      terms: {
        field: 'logstash_state.pipeline.id',
        size: MAX_BUCKET_SIZE,
      },
      aggs: {
        node: lastSeenByIndex({
          filter: {
            bool: {
              should: logstashStateMatches,
            },
          },
        }),
      },
    },
  };

  // Outer query on expected types to avoid catching kibana internal collection documents containing source_node.uuid
  return {
    timeout: `${timeout}s`,
    query: {
      bool: {
        filter: [
          {
            bool: {
              should: shardMatches.concat(logstashStateMatches),
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: clusterUuidTerm,
        aggs: metricsetsAggregations,
      },
    },
  };
};

export const enterpriseSearchQuery = ({ timeRange, timeout }: QueryOptions) => {
  if (!timeRange) throw new Error('enterpriseSearchQuery: missing timeRange parameter');

  const timestampField = '@timestamp';
  return {
    timeout: `${timeout}s`,
    query: {
      bool: {
        filter: [
          {
            range: {
              [timestampField]: {
                gte: timeRange.min,
                lte: timeRange.max,
              },
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: {
          field: 'enterprisesearch.cluster_uuid',
          size: MAX_BUCKET_SIZE,
        },
        aggs: {
          enterpriseSearch: {
            terms: {
              field: 'agent.id',
            },
            aggs: {
              health: lastSeenByIndex(
                {
                  filter: {
                    bool: {
                      should: [
                        {
                          term: {
                            'metricset.name': 'health',
                          },
                        },
                      ],
                    },
                  },
                },
                timestampField
              ),

              stats: lastSeenByIndex(
                {
                  filter: {
                    bool: {
                      should: [
                        {
                          term: {
                            'metricset.name': 'stats',
                          },
                        },
                      ],
                    },
                  },
                },
                timestampField
              ),
            },
          },
        },
      },
    },
  };
};

const clusterUuidTerm = { field: 'cluster_uuid', missing: 'standalone', size: 100 };

const lastSeenByIndex = (aggregation: { filter: any }, timestampField = 'timestamp') => {
  return {
    ...aggregation,
    aggs: {
      by_index: {
        terms: {
          field: '_index',
          size: MAX_BUCKET_SIZE,
        },
        aggs: {
          last_seen: {
            max: {
              field: timestampField,
            },
          },
        },
      },
    },
  };
};

const clusterAggregation = {
  terms: {
    field: 'cluster_uuid',
    size: MAX_BUCKET_SIZE,
  },
  aggs: {
    cluster_stats: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'cluster_stats',
              },
            },
            {
              term: {
                'metricset.name': 'cluster_stats',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('cluster_stats'),
              },
            },
          ],
        },
      },
    }),

    ccr: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'ccr_stats',
              },
            },
            {
              term: {
                'metricset.name': 'ccr',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('ccr'),
              },
            },
          ],
        },
      },
    }),

    index: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'index_stats',
              },
            },
            {
              term: {
                'metricset.name': 'index',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('index'),
              },
            },
          ],
        },
      },
    }),

    index_summary: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'indices_stats',
              },
            },
            {
              term: {
                'metricset.name': 'index_summary',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('index_summary'),
              },
            },
          ],
        },
      },
    }),

    index_recovery: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'index_recovery',
              },
            },
            {
              term: {
                'metricset.name': 'index_recovery',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('index_recovery'),
              },
            },
          ],
        },
      },
    }),
  },
};

// ignore the enrich metricset since it's not used by stack monitoring
const esAggregation = {
  terms: {
    field: 'node_stats.node_id',
    size: MAX_BUCKET_SIZE,
  },
  aggs: {
    node_stats: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'node_stats',
              },
            },
            {
              term: {
                'metricset.name': 'node_stats',
              },
            },
            {
              term: {
                'data_stream.dataset': getElasticsearchDataset('node_stats'),
              },
            },
          ],
        },
      },
    }),
  },
};

const kibanaAggregation = {
  terms: {
    field: 'kibana_stats.kibana.uuid',
    size: MAX_BUCKET_SIZE,
  },
  aggs: {
    stats: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'kibana_stats',
              },
            },
            {
              term: {
                'metricset.name': 'stats',
              },
            },
            {
              term: {
                'data_stream.dataset': getKibanaDataset('stats'),
              },
            },
          ],
        },
      },
    }),
  },
};

const logstashAggregation = {
  terms: {
    field: 'logstash_stats.logstash.uuid',
    size: MAX_BUCKET_SIZE,
  },
  aggs: {
    node_stats: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'logstash_stats',
              },
            },
            {
              term: {
                'metricset.name': 'node_stats',
              },
            },
            {
              term: {
                'data_stream.dataset': getLogstashDataset('node_stats'),
              },
            },
          ],
        },
      },
    }),
  },
};

const beatsAggregations = {
  beats_stats: {
    multi_terms: {
      size: MAX_BUCKET_SIZE,
      terms: [
        {
          field: 'beats_stats.beat.type',
        },
        {
          field: 'beats_stats.beat.uuid',
        },
      ],
    },
    aggs: {
      stats: lastSeenByIndex({
        filter: {
          bool: {
            should: [
              {
                term: {
                  type: 'beats_stats',
                },
              },
              {
                term: {
                  'metricset.name': 'stats',
                },
              },
              {
                term: {
                  'data_stream.dataset': getBeatDataset('stats'),
                },
              },
            ],
          },
        },
      }),
    },
  },

  beats_state: {
    multi_terms: {
      size: MAX_BUCKET_SIZE,
      terms: [
        {
          field: 'beats_state.beat.type',
        },
        {
          field: 'beats_state.beat.uuid',
        },
      ],
    },
    aggs: {
      state: lastSeenByIndex({
        filter: {
          bool: {
            should: [
              {
                term: {
                  type: 'beats_state',
                },
              },
              {
                term: {
                  'metricset.name': 'state',
                },
              },
              {
                term: {
                  'data_stream.dataset': getBeatDataset('state'),
                },
              },
            ],
          },
        },
      }),
    },
  },
};
