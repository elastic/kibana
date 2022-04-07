/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { LegacyRequest, Cluster, Bucket } from '../../types';
import { LOGSTASH } from '../../../common/constants';
import { createQuery } from '../create_query';
import { LogstashClusterMetric } from '../metrics';
import { getNewIndexPatterns } from '../cluster/get_index_patterns';
import { Globals } from '../../static_globals';

const { MEMORY, PERSISTED } = LOGSTASH.QUEUE_TYPES;

const getQueueTypes = (queueBuckets: Array<Bucket & { num_pipelines: { value: number } }>) => {
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
export function getLogstashForClusters(
  req: LegacyRequest,
  clusters: Array<{ cluster_uuid: string } | Cluster>,
  ccs?: string[]
) {
  const start = req.payload.timeRange.min;
  const end = req.payload.timeRange.max;
  const config = req.server.config;

  const dataset = 'node_stats';
  const type = 'logstash_stats';
  const moduleType = 'logstash';
  const indexPatterns = getNewIndexPatterns({
    config: Globals.app.config,
    ccs: ccs || req.payload.ccs,
    moduleType,
    dataset,
  });

  return Promise.all(
    clusters.map((cluster) => {
      const clusterUuid = get(cluster, 'elasticsearch.cluster.id', cluster.cluster_uuid);
      const maxBucketSize = config.ui.max_bucket_size;
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
            metric: LogstashClusterMetric.getMetricFields(),
          }),
          aggs: {
            logstash_uuids: {
              terms: {
                field: 'logstash_stats.logstash.uuid',
                size: maxBucketSize,
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
                size: maxBucketSize,
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
                    size: maxBucketSize,
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
            pipelines_nested_mb: {
              nested: {
                path: 'logstash.node.stats.pipelines',
              },
              aggs: {
                pipelines: {
                  sum_bucket: {
                    buckets_path: 'queue_types>num_pipelines',
                  },
                },
                queue_types: {
                  terms: {
                    field: 'logstash.node.stats.pipelines.queue.type',
                    size: maxBucketSize,
                  },
                  aggs: {
                    num_pipelines: {
                      cardinality: {
                        field: 'logstash.node.stats.pipelines.id',
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

        let types = get(aggregations, 'pipelines_nested_mb.queue_types.buckets', []);
        if (!types || types.length === 0) {
          types = aggregations.pipelines_nested?.queue_types.buckets ?? [];
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
            pipeline_count:
              get(aggregations, 'pipelines_nested_mb.pipelines.value') ||
              get(aggregations, 'pipelines_nested.pipelines.value', 0),
            queue_types: getQueueTypes(types),
            versions: logstashVersions.map((versionBucket: Bucket) => versionBucket.key),
          },
        };
      });
    })
  );
}
