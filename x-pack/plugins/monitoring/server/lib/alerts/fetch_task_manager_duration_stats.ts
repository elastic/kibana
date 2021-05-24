/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import { get } from 'lodash';
import moment from 'moment';
import { NORMALIZED_DERIVATIVE_UNIT } from '../../../common/constants';
import { AlertCluster, AlertTaskManagerDurationStats } from '../../../common/types/alerts';

interface KibanaBucketESResponse {
  key: string;
  average_cpu: { value: number };
}

interface ClusterBucketESResponse {
  key: string;
  kibanas: {
    buckets: KibanaBucketESResponse[];
  };
}

export async function fetchTaskManagerDurationStats(
  esClient: ElasticsearchClient,
  clusters: AlertCluster[],
  index: string,
  startMs: number,
  endMs: number,
  size: number,
  alertTypes?: string[]
): Promise<AlertTaskManagerDurationStats[]> {
  // Using pure MS didn't seem to work well with the date_histogram interval
  // but minutes does
  const intervalInMinutes = moment.duration(endMs - startMs).asMinutes();
  const filterPath = ['aggregations'];

  const stats: AlertTaskManagerDurationStats[] = [];
  const responses = await Promise.all(
    (alertTypes || []).map(async (alertType) => {
      const params = {
        index,
        filterPath,
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    cluster_uuid: clusters.map((cluster) => cluster.clusterUuid),
                  },
                },
                {
                  term: {
                    type: 'kibana_stats',
                  },
                },
                {
                  term: {
                    'kibana_stats.task_manager.drift.by_type.alert_type': alertType,
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
                size,
                include: clusters.map((cluster) => cluster.clusterUuid),
              },
              aggs: {
                kibanas: {
                  terms: {
                    field: 'kibana_stats.kibana.uuid',
                    size,
                  },
                  aggs: {
                    index: {
                      terms: {
                        field: '_index',
                        size: 1,
                      },
                    },
                    average_p99: {
                      avg: {
                        field: 'kibana_stats.task_manager.drift.by_type.stat.p50',
                      },
                    },
                    name: {
                      terms: {
                        field: 'kibana_stats.kibana.name',
                        size: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const { body: response } = await esClient.search(params);
      return response;
    })
  );

  let alertTypeIndex: number = 0;
  for (const response of responses) {
    const alertType = alertTypes ? alertTypes[alertTypeIndex++] : null;
    const clusterBuckets = get(
      response,
      'aggregations.clusters.buckets',
      []
    ) as ClusterBucketESResponse[];
    for (const clusterBucket of clusterBuckets) {
      for (const node of clusterBucket.kibanas.buckets) {
        const indexName = get(node, 'index.buckets[0].key', '');
        const stat = {
          clusterUuid: clusterBucket.key,
          nodeId: node.key,
          nodeName: get(node, 'name.buckets[0].key'),
          p99: get(node, 'average_p99.value'),
          alertType,
          ccs: indexName.includes(':') ? indexName.split(':')[0] : null,
        };
        stats.push(stat);
      }
    }
  }
  return stats;
}
