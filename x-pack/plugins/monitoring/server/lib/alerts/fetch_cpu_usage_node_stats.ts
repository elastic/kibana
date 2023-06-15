/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core/server';
import { InferSearchResponseOf } from '@kbn/es-types';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';
import { AlertCpuUsageNodeStats } from '../../../common/types/alerts';
import { MonitoringConfig } from '../../config';
import { getElasticsearchDataset, getIndexPatterns } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';

interface Options {
  esClient: ElasticsearchClient;
  clusterUuids: string[];
  startMs: number;
  endMs: number;
  filterQuery?: QueryDslQueryContainer;
}

export async function fetchCpuUsageNodeStats(
  options: Options,
  config: MonitoringConfig
): Promise<AlertCpuUsageNodeStats[]> {
  if (config.ui.container.elasticsearch.enabled) {
    return fetchContainerStats(options, config);
  }

  return fetchNonContainerStats(options, config);
}

async function fetchContainerStats(
  { esClient, startMs, endMs, clusterUuids, filterQuery }: Options,
  config: MonitoringConfig
) {
  const indexPatterns = getIndexPatterns({
    config,
    moduleType: 'elasticsearch',
    dataset: 'node_stats',
    ccs: CCS_REMOTE_PATTERN,
  });

  const params = {
    index: indexPatterns,
    filter_path: ['aggregations'],
    size: 0,
    query: {
      bool: {
        filter: [
          createDatasetFilter('node_stats', 'node_stats', getElasticsearchDataset('node_stats')),
          {
            terms: {
              cluster_uuid: clusterUuids,
            },
          },
          {
            range: {
              timestamp: {
                format: 'epoch_millis',
                gte: startMs,
                lte: endMs,
              },
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: {
          field: 'cluster_uuid',
          size: config.ui.max_bucket_size,
        },
        aggs: {
          nodes: {
            terms: {
              field: 'node_stats.node_id',
              size: config.ui.max_bucket_size,
            },
            aggs: {
              name: {
                terms: {
                  field: 'source_node.name',
                  size: 1,
                },
              },
              // Used to check for CCS and get the remote cluster name
              index: {
                terms: {
                  field: '_index',
                  size: 1,
                },
              },
              max_usage_nanos: {
                max: {
                  field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
                },
              },
              min_usage_nanos: {
                min: {
                  field: 'node_stats.os.cgroup.cpuacct.usage_nanos',
                },
              },
              max_periods: {
                max: {
                  field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
                },
              },
              min_periods: {
                min: {
                  field: 'node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
                },
              },
              quota_micros: {
                max: {
                  field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
                },
              },
            },
          },
        },
      },
    },
  };

  if (filterQuery) {
    (params.query!.bool!.filter! as QueryDslQueryContainer[]).push(filterQuery);
  }

  const response = (await esClient.search<unknown>(params)) as unknown as InferSearchResponseOf<
    unknown,
    typeof params
  >;

  if (!response.aggregations) {
    throw new Error('Failed to resolve needed aggregations for CPU Usage Rule');
  }

  return response.aggregations.clusters.buckets.flatMap((cluster) => {
    return cluster.nodes.buckets.map((node) => {
      let nodeName;
      if (node.name.buckets.length) {
        nodeName = node.name.buckets[0].key as string;
      }

      let ccs;
      if (node.index.buckets.length) {
        const index = node.index.buckets[0].key as string;
        ccs = index.includes(':') ? index.split(':')[0] : undefined;
      }

      if (
        node.max_usage_nanos.value === null ||
        node.min_usage_nanos.value === null ||
        node.max_periods.value === null ||
        node.min_periods.value === null ||
        node.quota_micros.value === null
      ) {
        return {
          clusterUuid: cluster.key as string,
          nodeId: node.key as string,
          cpuUsage: undefined,
          nodeName,
          ccs,
        };
      }

      const usageNanos = node.max_usage_nanos.value - node.min_usage_nanos.value;
      const periods = node.max_periods.value - node.min_periods.value;

      const cpuUsage = (usageNanos / (node.quota_micros.value * periods * 1000)) * 100;

      return {
        clusterUuid: cluster.key as string,
        nodeId: node.key as string,
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        nodeName,
        ccs,
      };
    });
  });
}

async function fetchNonContainerStats(
  { esClient, startMs, endMs, clusterUuids, filterQuery }: Options,
  config: MonitoringConfig
) {
  const indexPatterns = getIndexPatterns({
    config,
    moduleType: 'elasticsearch',
    dataset: 'node_stats',
    ccs: CCS_REMOTE_PATTERN,
  });

  const params = {
    index: indexPatterns,
    filter_path: ['aggregations'],
    size: 0,
    query: {
      bool: {
        filter: [
          createDatasetFilter('node_stats', 'node_stats', getElasticsearchDataset('node_stats')),
          {
            terms: {
              cluster_uuid: clusterUuids,
            },
          },
          {
            range: {
              timestamp: {
                format: 'epoch_millis',
                gte: startMs,
                lte: endMs,
              },
            },
          },
        ],
      },
    },
    aggs: {
      clusters: {
        terms: {
          field: 'cluster_uuid',
          size: config.ui.max_bucket_size,
        },
        aggs: {
          nodes: {
            terms: {
              field: 'node_stats.node_id',
              size: config.ui.max_bucket_size,
            },
            aggs: {
              name: {
                terms: {
                  field: 'source_node.name',
                  size: 1,
                },
              },
              // Used to check for CCS and get the remote cluster name
              index: {
                terms: {
                  field: '_index',
                  size: 1,
                },
              },
              average_cpu: {
                avg: {
                  field: 'node_stats.process.cpu.percent',
                },
              },
            },
          },
        },
      },
    },
  };

  if (filterQuery) {
    (params.query!.bool!.filter! as QueryDslQueryContainer[]).push(filterQuery);
  }

  const response = (await esClient.search<unknown>(params)) as unknown as InferSearchResponseOf<
    unknown,
    typeof params
  >;

  if (!response.aggregations) {
    throw new Error('Failed to resolve needed aggregations for CPU Usage Rule');
  }

  return response.aggregations.clusters.buckets.flatMap((cluster) => {
    return cluster.nodes.buckets.map((node) => {
      let nodeName;
      if (node.name.buckets.length) {
        nodeName = node.name.buckets[0].key as string;
      }

      let ccs;
      if (node.index.buckets.length) {
        const index = node.index.buckets[0].key as string;
        ccs = index.includes(':') ? index.split(':')[0] : undefined;
      }

      return {
        clusterUuid: cluster.key as string,
        nodeId: node.key as string,
        cpuUsage: node.average_cpu.value ?? undefined,
        nodeName,
        ccs,
      };
    });
  });
}
