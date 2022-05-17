/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * returns a nested aggregation of the monitored products per cluster, standalone
 * included. each product aggregation retrieves the related metricsets and the
 * last time they were ingested.
 */
export const monitoredClustersQuery = () => {
  return {
    query: {
      bool: {
        filter: [
          {
            range: {
              timestamp: {
                gte: 'now-60m',
                lte: 'now',
              },
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: {
          script: `
            if (doc['cluster_uuid'].size() == 0 || doc['cluster_uuid'].empty) {
              return 'standalone';
            } else {
              return doc['cluster_uuid'].value;
            }
          `,
        },
        aggs: {
          cluster: clusterAggregation,
          elasticsearch: esAggregation,
          beats: beatsAggregation,
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
export const stableMetricsetsQuery = () => {
  return {
    aggs: {
      clusters: {
        terms: {
          script: `
            if (doc['cluster_uuid'].size() == 0 || doc['cluster_uuid'].empty) {
              return 'standalone';
            } else {
              return doc['cluster_uuid'].value;
            }
          `,
        },
        aggs: {
          elasticsearch: {
            terms: {
              field: 'node_stats.node_id',
              size: 10000,
            },
            aggs: {
              shard: lastSeenByIndex({
                filter: {
                  bool: {
                    should: [
                      {
                        term: {
                          type: 'shard',
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
              field: 'logstash.node.id',
              size: 10000,
            },
            aggs: {
              node: lastSeenByIndex({
                filter: {
                  bool: {
                    should: [
                      {
                        term: {
                          type: 'node',
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
        },
      },
    },
  };
};

const lastSeenByIndex = (aggregation) => {
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
    size: 10000,
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

    index: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'index',
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
                type: 'index_summary',
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

const esAggregation = {
  terms: {
    field: 'node_stats.node_id',
    size: 10000,
  },
  aggs: {
    enrich: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'enrich',
              },
            },
            {
              term: {
                'metricset.name': 'enrich',
              },
            },
          ],
        },
      },
    }),

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
    kibana_stats: lastSeenByIndex({
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
    node: lastSeenByIndex({
      filter: {
        bool: {
          should: [
            {
              term: {
                type: 'node',
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

const beatsAggregation = {
  terms: {
    field: 'beats_stats.beat.uuid',
    size: 10000,
  },
  aggs: {
    beats_stats: lastSeenByIndex({
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
};
