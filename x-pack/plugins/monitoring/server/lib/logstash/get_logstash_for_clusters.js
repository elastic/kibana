/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Bluebird from 'bluebird';
import { get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createQuery } from '../create_query.js';
import { LogstashClusterMetric } from '../metrics';
import { LOGSTASH } from '../../../common/constants';

const { MEMORY, PERSISTED } = LOGSTASH.QUEUE_TYPES;

const getQueueTypes = (queueBuckets) => {
  const memory = queueBuckets.find((bucket) => bucket.key === MEMORY);
  const persisted = queueBuckets.find((bucket) => bucket.key === PERSISTED);
  return {
    [MEMORY]: get(memory, 'num_pipelines.value', 0),
    [PERSISTED]: get(persisted, 'num_pipelines.value', 0),
  };
};

/*
 * Get high-level info for Logstashs in a set of clusters
 * The set contains multiple clusters for cluster listing page
 * The set contains single cluster for cluster overview page and cluster status bar

 * Timespan for the data is an interval of time based on calculations of an
 * interval size using the same calculation as determining bucketSize using
 * the timepicker for a chart

 * Returns, for each cluster,
 *  - number of instances
 *  - combined health
 */
export function getLogstashForClusters(req, lsIndexPattern, clusters) {
  checkParam(lsIndexPattern, 'lsIndexPattern in logstash/getLogstashForClusters');

  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config();

  return Bluebird.map(clusters, (cluster) => {
    const clusterUuid = cluster.cluster_uuid;
    const params = {
      index: lsIndexPattern,
      size: 0,
      ignoreUnavailable: true,
      body: {
        query: createQuery({
          type: 'logstash_stats',
          start,
          end,
          clusterUuid,
          metric: LogstashClusterMetric.getMetricFields(),
        }),
        aggs: {
          logstash_uuids: {
            terms: {
              field: 'logstash_stats.logstash.uuid',
              size: config.get('monitoring.ui.max_bucket_size'),
            },
            aggs: {
              latest_report: {
                terms: {
                  field: 'logstash_stats.timestamp',
                  size: 1,
                  order: {
                    _key: 'desc',
                  },
                },
                aggs: {
                  memory_used: {
                    max: {
                      field: 'logstash_stats.jvm.mem.heap_used_in_bytes',
                    },
                  },
                  memory: {
                    max: {
                      field: 'logstash_stats.jvm.mem.heap_max_in_bytes',
                    },
                  },
                  events_in_total: {
                    max: {
                      field: 'logstash_stats.events.in',
                    },
                  },
                  events_out_total: {
                    max: {
                      field: 'logstash_stats.events.out',
                    },
                  },
                },
              },
              memory_used_per_node: {
                max_bucket: {
                  buckets_path: 'latest_report>memory_used',
                },
              },
              memory_per_node: {
                max_bucket: {
                  buckets_path: 'latest_report>memory',
                },
              },
              events_in_total_per_node: {
                max_bucket: {
                  buckets_path: 'latest_report>events_in_total',
                },
              },
              events_out_total_per_node: {
                max_bucket: {
                  buckets_path: 'latest_report>events_out_total',
                },
              },
            },
          },
          logstash_versions: {
            terms: {
              field: 'logstash_stats.logstash.version',
              size: config.get('monitoring.ui.max_bucket_size'),
            },
          },
          pipelines_nested: {
            nested: {
              path: 'logstash_stats.pipelines',
            },
            aggs: {
              pipelines: {
                sum_bucket: {
                  buckets_path: 'queue_types>num_pipelines',
                },
              },
              queue_types: {
                terms: {
                  field: 'logstash_stats.pipelines.queue.type',
                  size: config.get('monitoring.ui.max_bucket_size'),
                },
                aggs: {
                  num_pipelines: {
                    cardinality: {
                      field: 'logstash_stats.pipelines.id',
                    },
                  },
                },
              },
            },
          },
          events_in_total: {
            sum_bucket: {
              buckets_path: 'logstash_uuids>events_in_total_per_node',
            },
          },
          events_out_total: {
            sum_bucket: {
              buckets_path: 'logstash_uuids>events_out_total_per_node',
            },
          },
          memory_used: {
            sum_bucket: {
              buckets_path: 'logstash_uuids>memory_used_per_node',
            },
          },
          memory: {
            sum_bucket: {
              buckets_path: 'logstash_uuids>memory_per_node',
            },
          },
          max_uptime: {
            max: {
              field: 'logstash_stats.jvm.uptime_in_millis',
            },
          },
        },
      },
    };

    const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
    return callWithRequest(req, 'search', params).then((result) => {
      const aggregations = get(result, 'aggregations', {});
      const logstashUuids = get(aggregations, 'logstash_uuids.buckets', []);
      const logstashVersions = get(aggregations, 'logstash_versions.buckets', []);

      // everything is initialized such that it won't impact any rollup
      let eventsInTotal = 0;
      let eventsOutTotal = 0;
      let memory = 0;
      let memoryUsed = 0;
      let maxUptime = 0;

      // if the cluster has logstash instances at all
      if (logstashUuids.length) {
        eventsInTotal = get(aggregations, 'events_in_total.value');
        eventsOutTotal = get(aggregations, 'events_out_total.value');
        memory = get(aggregations, 'memory.value');
        memoryUsed = get(aggregations, 'memory_used.value');
        maxUptime = get(aggregations, 'max_uptime.value');
      }

      return {
        clusterUuid,
        stats: {
          node_count: logstashUuids.length,
          events_in_total: eventsInTotal,
          events_out_total: eventsOutTotal,
          avg_memory: memory,
          avg_memory_used: memoryUsed,
          max_uptime: maxUptime,
          pipeline_count: get(aggregations, 'pipelines_nested.pipelines.value', 0),
          queue_types: getQueueTypes(get(aggregations, 'pipelines_nested.queue_types.buckets', [])),
          versions: logstashVersions.map((versionBucket) => versionBucket.key),
        },
      };
    });
  });
}
