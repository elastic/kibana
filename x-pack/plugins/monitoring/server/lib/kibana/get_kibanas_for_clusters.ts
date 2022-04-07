/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain, find } from 'lodash';
import { LegacyRequest, Cluster, Bucket } from '../../types';
import { createQuery } from '../create_query';
import { KibanaClusterMetric } from '../metrics';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

/*
 * Get high-level info for Kibanas in a set of clusters
 * The set contains multiple clusters for cluster listing page
 * The set contains single cluster for cluster overview page and cluster status bar

 * Timespan for the data is an interval of time based on calculations of an
 * interval size using the same calculation as determining bucketSize using
 * the timepicker for a chart

 * Returns, for each cluster,
 *  - number of instances
 *  - combined health
 */
export function getKibanasForClusters(req: LegacyRequest, clusters: Cluster[], ccs: string[]) {
  const config = req.server.config;
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  const moduleType = 'kibana';
  const type = 'kibana_stats';
  const dataset = 'stats';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    moduleType,
    dataset,
    ccs,
  });

  return Promise.all(
    clusters.map((cluster) => {
      const clusterUuid = cluster.elasticsearch?.cluster?.id ?? cluster.cluster_uuid;
      const metric = KibanaClusterMetric.getMetricFields();
      const params = {
        index: indexPatterns,
        size: 0,
        ignore_unavailable: true,
        body: {
          query: createQuery({
            type,
            dsDataset: `${moduleType}.${dataset}`,
            metricset: dataset,
            start,
            end,
            clusterUuid,
            metric,
          }),
          aggs: {
            kibana_uuids: {
              terms: {
                field: 'kibana_stats.kibana.uuid',
                size: config.ui.max_bucket_size,
              },
              aggs: {
                latest_report: {
                  terms: {
                    field: 'kibana_stats.timestamp',
                    size: 1,
                    order: {
                      _key: 'desc',
                    },
                  },
                  aggs: {
                    response_time_max: {
                      max: {
                        field: 'kibana_stats.response_times.max',
                      },
                    },
                    memory_rss: {
                      max: {
                        field: 'kibana_stats.process.memory.resident_set_size_in_bytes',
                      },
                    },
                    memory_heap_size_limit: {
                      max: {
                        field: 'kibana_stats.process.memory.heap.size_limit',
                      },
                    },
                    concurrent_connections: {
                      max: {
                        field: 'kibana_stats.concurrent_connections',
                      },
                    },
                    requests_total: {
                      max: {
                        field: 'kibana_stats.requests.total',
                      },
                    },
                  },
                },
                response_time_max_per: {
                  max_bucket: {
                    buckets_path: 'latest_report>response_time_max',
                  },
                },
                memory_rss_per: {
                  max_bucket: {
                    buckets_path: 'latest_report>memory_rss',
                  },
                },
                memory_heap_size_limit_per: {
                  max_bucket: {
                    buckets_path: 'latest_report>memory_heap_size_limit',
                  },
                },
                concurrent_connections_per: {
                  max_bucket: {
                    buckets_path: 'latest_report>concurrent_connections',
                  },
                },
                requests_total_per: {
                  max_bucket: {
                    buckets_path: 'latest_report>requests_total',
                  },
                },
              },
            },
            response_time_max: {
              max_bucket: {
                buckets_path: 'kibana_uuids>response_time_max_per',
              },
            },
            memory_rss: {
              sum_bucket: {
                buckets_path: 'kibana_uuids>memory_rss_per',
              },
            },
            memory_heap_size_limit: {
              sum_bucket: {
                buckets_path: 'kibana_uuids>memory_heap_size_limit_per',
              },
            },
            concurrent_connections: {
              sum_bucket: {
                buckets_path: 'kibana_uuids>concurrent_connections_per',
              },
            },
            requests_total: {
              sum_bucket: {
                buckets_path: 'kibana_uuids>requests_total_per',
              },
            },
            status: {
              terms: {
                field: 'kibana_stats.kibana.status',
                order: {
                  max_timestamp: 'desc',
                },
              },
              aggs: {
                max_timestamp: {
                  max: {
                    field: 'timestamp',
                  },
                },
              },
            },
          },
        },
      };

      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
      return callWithRequest(req, 'search', params).then((result) => {
        const aggregations = result.aggregations ?? {};
        const kibanaUuids = aggregations.kibana_uuids?.buckets ?? [];
        const statusBuckets = aggregations.status?.buckets ?? [];

        // everything is initialized such that it won't impact any rollup
        let status = null;
        let requestsTotal = 0;
        let connections = 0;
        let responseTime = 0;
        let memorySize = 0;
        let memoryLimit = 0;

        // if the cluster has kibana instances at all
        if (kibanaUuids.length) {
          // get instance status by finding the latest status bucket
          const latestTimestamp = chain(statusBuckets)
            .map((bucket) => bucket.max_timestamp.value)
            .max()
            .value();
          const latestBucket = find(
            statusBuckets,
            (bucket) => bucket.max_timestamp.value === latestTimestamp
          );
          status = latestBucket.key;

          requestsTotal = aggregations.requests_total?.value;
          connections = aggregations.concurrent_connections?.value;
          responseTime = aggregations.response_time_max?.value;
          memorySize = aggregations.memory_rss?.value;
          memoryLimit = aggregations.memory_heap_size_limit?.value;
        }

        return {
          clusterUuid,
          stats: {
            uuids: kibanaUuids.map(({ key }: Bucket) => key),
            status,
            requests_total: requestsTotal,
            concurrent_connections: connections,
            response_time_max: responseTime,
            memory_size: memorySize,
            memory_limit: memoryLimit,
            count: kibanaUuids.length,
          },
        };
      });
    })
  );
}
