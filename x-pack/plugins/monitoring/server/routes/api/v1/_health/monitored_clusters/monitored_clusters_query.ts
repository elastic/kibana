/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimeRange } from '../../../../../../common/http_api/shared';

/**
 * returns a nested aggregation of the monitored products per cluster, standalone
 * included. each product aggregation retrieves the related metricsets and the
 * last time they were ingested.
 * if a product requires multiple aggregations the key is suffixed with an identifer
 * separated by an underscore. eg beats_state
 */
export const monitoredClustersQuery = ({ min, max }: TimeRange) => {
  return {
    query: {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: min,
                lte: max,
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
 * some metricset documents use a stable ID to maintain a single occurence of
 * the documents in the index. we query those metricsets separately without
 * a time range filter
 */
export const persistentMetricsetsQuery = () => {
  const metricsetsAggregations = {
    elasticsearch: {
      terms: {
        field: 'source_node.uuid',
        size: 1000,
      },
      aggs: {
        shard: lastSeenByIndex({
          filter: {
            bool: {
              should: [
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
              ],
            },
          },
        }),
      },
    },

    logstash: {
      terms: {
        field: 'logstash_state.pipeline.id',
        size: 1000,
      },
      aggs: {
        node: lastSeenByIndex({
          filter: {
            bool: {
              should: [
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
              ],
            },
          },
        }),
      },
    },
  };

  return {
    aggs: {
      clusters: {
        terms: clusterUuidTerm,
        aggs: metricsetsAggregations,
      },
    },
  };
};

export const enterpriseSearchQuery = ({ min, max }: TimeRange) => {
  return {
    query: {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: min,
                lte: max,
              },
            },
          },
          {
            term: {
              'event.module': {
                value: 'enterprisesearch',
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
        },
        aggs: {
          enterpriseSearch: {
            terms: {
              field: 'agent.hostname',
            },
            aggs: {
              health: lastSeenByIndex({
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
              }),

              stats: lastSeenByIndex({
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
              }),
            },
          },
        },
      },
    },
  };
};

const clusterUuidTerm = { field: 'cluster_uuid', missing: 'standalone', size: 100 };

const lastSeenByIndex = (aggregation: { filter: any }) => {
  return {
    ...aggregation,
    aggs: {
      by_index: {
        terms: {
          field: '_index',
        },
        aggs: {
          last_seen: {
            max: {
              field: 'timestamp',
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
    size: 100,
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
    size: 10000,
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
          ],
        },
      },
    }),
  },
};

const kibanaAggregation = {
  terms: {
    field: 'kibana_stats.kibana.uuid',
    size: 10000,
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
          ],
        },
      },
    }),
  },
};

const logstashAggregation = {
  terms: {
    field: 'logstash_stats.logstash.uuid',
    size: 10000,
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
          ],
        },
      },
    }),
  },
};

const beatsAggregations = {
  beats_stats: {
    terms: {
      field: 'beats_stats.beat.uuid',
      size: 10000,
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
            ],
          },
        },
      }),
    },
  },

  beats_state: {
    terms: {
      field: 'beats_state.beat.uuid',
      size: 10000,
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
            ],
          },
        },
      }),
    },
  },
};
