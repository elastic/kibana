/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { InferSearchResponseOf } from '@kbn/es-types';
import { CCS_REMOTE_PATTERN } from '../../../common/constants';
import { AlertCpuUsageNodeStats } from '../../../common/types/alerts';
import { MonitoringConfig } from '../../config';
import { getElasticsearchDataset, getIndexPatterns } from '../cluster/get_index_patterns';
import { createDatasetFilter } from './create_dataset_query_filter';

interface CpuUsageFieldsWithValues {
  'max of node_stats.os.cgroup.cpu.cfs_quota_micros': number | null;
  'max of node_stats.os.cgroup.cpuacct.usage_nanos': number | null;
  'min of node_stats.os.cgroup.cpuacct.usage_nanos': number | null;
  'max of node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods': number | null;
  'min of node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods': number | null;
}

interface Options {
  esClient: ElasticsearchClient;
  clusterUuids: string[];
  startMs: number;
  endMs: number;
  filterQuery?: QueryDslQueryContainer;
  logger: Logger;
}

export async function fetchCpuUsageNodeStats(
  options: Options,
  config: MonitoringConfig
): Promise<AlertCpuUsageNodeStats[]> {
  if (config.ui.container.elasticsearch.enabled) {
    options.logger.debug('CPU usage rule: Computing usage for containerized clusters');
    return fetchContainerStats(options, config);
  }

  options.logger.debug('CPU usage rule: Computing usage for non-containerized clusters');
  return fetchNonContainerStats(options, config);
}

async function fetchContainerStats(
  { esClient, startMs, endMs, clusterUuids, filterQuery, logger }: Options,
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
              // Fallback value in case container limits are not specified
              average_cpu_usage_percent: {
                avg: {
                  field: 'node_stats.process.cpu.percent',
                },
              },
              // Container limit min and max, to calculate usage and detect config changes
              quota_micros_max: {
                max: {
                  field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
                },
              },
              quota_micros_min: {
                min: {
                  field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
                },
              },
              // Usage to calculate delta
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
              // Periods to calculate delta
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
    return cluster.nodes.buckets.map((node): AlertCpuUsageNodeStats => {
      let nodeName;
      if (node.name.buckets.length) {
        nodeName = node.name.buckets[0].key as string;
      }

      let ccs;
      if (node.index.buckets.length) {
        const index = node.index.buckets[0].key as string;
        ccs = index.includes(':') ? index.split(':')[0] : undefined;
      }

      const limitsNotSet = node.quota_micros_max.value === -1 && node.quota_micros_min.value === -1;
      const notRunningInAContainer =
        node.quota_micros_min.value === null && node.quota_micros_max.value === null;
      if (limitsNotSet || notRunningInAContainer) {
        return {
          missingLimits: true,
          clusterUuid: cluster.key as string,
          nodeId: node.key as string,
          cpuUsage: node.average_cpu_usage_percent.value ?? undefined,
          nodeName,
          ccs,
        };
      }

      if (node.quota_micros_min.value !== node.quota_micros_max.value) {
        return {
          limitsChanged: true,
          clusterUuid: cluster.key as string,
          nodeId: node.key as string,
          cpuUsage: undefined,
          nodeName,
          ccs,
        };
      }

      if (
        node.max_usage_nanos.value === null ||
        node.min_usage_nanos.value === null ||
        node.max_periods.value === null ||
        node.min_periods.value === null ||
        node.quota_micros_max.value === null
      ) {
        logger.warn(
          `CPU usage rule: Some aggregated values needed for container CPU usage calculation was empty: ${findEmptyValues(
            {
              'max of node_stats.os.cgroup.cpu.cfs_quota_micros': node.quota_micros_max.value,
              'max of node_stats.os.cgroup.cpuacct.usage_nanos': node.max_usage_nanos.value,
              'min of node_stats.os.cgroup.cpuacct.usage_nanos': node.min_usage_nanos.value,
              'max of node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods':
                node.max_periods.value,
              'min of node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods':
                node.min_periods.value,
            }
          )}`
        );

        return {
          clusterUuid: cluster.key as string,
          nodeId: node.key as string,
          cpuUsage: undefined,
          nodeName,
          ccs,
        };
      }

      const usageDeltaNanos = node.max_usage_nanos.value - node.min_usage_nanos.value;
      const periodsDelta = node.max_periods.value - node.min_periods.value;

      const cpuUsage = computeCfsPercentCpuUsage(
        usageDeltaNanos,
        node.quota_micros_max.value,
        periodsDelta
      );

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

function findEmptyValues(fieldsWithValues: CpuUsageFieldsWithValues): string {
  const entries: Array<[string, number | null]> = Object.entries(fieldsWithValues);
  return entries
    .filter(([, value]) => value === null)
    .map(([key]) => key)
    .join(', ');
}

function computeCfsPercentCpuUsage(usageNanos: number, quotaMicros: number, periods: number) {
  // See https://github.com/elastic/kibana/pull/159351 for an explanation of this formula
  const quotaNanos = quotaMicros * 1000;
  const limitNanos = quotaNanos * periods;
  const usageAsFactor = usageNanos / limitNanos;
  return usageAsFactor * 100;
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
              // Container limit min and max, to detect possible config errors
              quota_micros_max: {
                max: {
                  field: 'node_stats.os.cgroup.cpu.cfs_quota_micros',
                },
              },
              quota_micros_min: {
                min: {
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
    return cluster.nodes.buckets.map((node): AlertCpuUsageNodeStats => {
      let nodeName;
      if (node.name.buckets.length) {
        nodeName = node.name.buckets[0].key as string;
      }

      let ccs;
      if (node.index.buckets.length) {
        const index = node.index.buckets[0].key as string;
        ccs = index.includes(':') ? index.split(':')[0] : undefined;
      }

      const runningInAContainer =
        node.quota_micros_min.value !== null || node.quota_micros_max.value !== null;

      return {
        clusterUuid: cluster.key as string,
        nodeId: node.key as string,
        cpuUsage: node.average_cpu.value ?? undefined,
        nodeName,
        ccs,
        unexpectedLimits: runningInAContainer,
      };
    });
  });
}
