/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Promise from 'bluebird';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query.js';
import { ApmClusterMetric } from '../metrics/apm/classes';

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
export function getApmsForClusters(req, apmIndexPattern, clusters) {
  checkParam(apmIndexPattern, 'apmIndexPattern in apm/getApmsForClusters');

  const config = req.server.config();
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;

  return Promise.map(clusters, cluster => {
    const clusterUuid = cluster.cluster_uuid;
    const metric = ApmClusterMetric.getMetricFields();
    const params = {
      index: apmIndexPattern,
      size: 0,
      ignoreUnavailable: true,
      body: {
        query: createQuery({
          type: 'beats_stats',
          start,
          end,
          clusterUuid,
          metric,
          filters: [
            {
              bool: {
                should: [
                  { term: { 'beats_stats.beat.type': 'apm-server' } }
                ]
              }
            }
          ]
        }),
        aggs: {
          apm_uuids: {
            terms: {
              field: 'beats_stats.beat.uuid',
              size: config.get('xpack.monitoring.max_bucket_size')
            },
            aggs: {
              latest_report: {
                terms: {
                  field: 'beats_stats.timestamp',
                  size: 1,
                  order: {
                    '_key': 'desc'
                  }
                }
              },
              requests_total_per: {
                sum: {
                  field: 'beats_stats.metrics.apm-server.server.request.count'
                }
              }
            }
          },
          requests_total: {
            sum_bucket: {
              buckets_path: 'apm_uuids>requests_total_per'
            }
          },
          max_timestamp: {
            max: {
              field: 'timestamp'
            }
          }
        }
      }
    };

    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    return callWithRequest(req, 'search', params)
      .then(result => {
        const aggregations = get(result, 'aggregations', {});
        const apmUuids =  get(aggregations, 'apm_uuids.buckets', []);


        // everything is initialized such that it won't impact any rollup
        let requestsTotal = 0;
        let connections = 0;
        let responseTime = 0;
        let memorySize = 0;
        let memoryLimit = 0;

        // if the cluster has apm instances at all
        if (apmUuids.length) {
        // get instance status by finding the latest status bucket
          requestsTotal = get(aggregations, 'requests_total.value');
          connections = get(aggregations, 'concurrent_connections.value');
          responseTime = get(aggregations, 'response_time_max.value');
          memorySize = get(aggregations, 'memory_rss.value'); // resident set size
          memoryLimit = get(aggregations, 'memory_heap_size_limit.value'); // max old space
        }

        return {
          clusterUuid,
          stats: {
            uuids: get(aggregations, 'apm_uuids.buckets', []).map(({ key }) => key),
            requests_total: requestsTotal,
            concurrent_connections: connections,
            response_time_max: responseTime,
            memory_size: memorySize,
            memory_limit: memoryLimit,
            count: apmUuids.length
          }
        };
      });
  });
}
