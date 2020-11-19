/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Bluebird from 'bluebird';
import { chain, find, get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query.js';
import { KibanaClusterMetric } from '../metrics';

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
export function getKibanasForClusters(req, kbnIndexPattern, clusters) {
  checkParam(kbnIndexPattern, 'kbnIndexPattern in kibana/getKibanasForClusters');

  const config = req.server.config();
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  return Bluebird.map(clusters, (cluster) => {
    const clusterUuid = cluster.cluster_uuid;
    const metric = KibanaClusterMetric.getMetricFields();
    const params = {
      index: kbnIndexPattern,
      size: 0,
      ignoreUnavailable: true,
      body: {
        query: createQuery({
          type: 'kibana_stats',
          start,
          end,
          clusterUuid,
          metric,
        }),
        aggs: {
          kibana_uuids: {
            terms: {
              field: 'kibana_stats.kibana.uuid',
              size: config.get('monitoring.ui.max_bucket_size'),
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
      const aggregations = get(result, 'aggregations', {});
      const kibanaUuids = get(aggregations, 'kibana_uuids.buckets', []);
      const statusBuckets = get(aggregations, 'status.buckets', []);

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
        status = get(latestBucket, 'key');

        requestsTotal = get(aggregations, 'requests_total.value');
        connections = get(aggregations, 'concurrent_connections.value');
        responseTime = get(aggregations, 'response_time_max.value');
        memorySize = get(aggregations, 'memory_rss.value'); // resident set size
        memoryLimit = get(aggregations, 'memory_heap_size_limit.value'); // max old space
      }

      return {
        clusterUuid,
        stats: {
          uuids: get(aggregations, 'kibana_uuids.buckets', []).map(({ key }) => key),
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
  });
}
