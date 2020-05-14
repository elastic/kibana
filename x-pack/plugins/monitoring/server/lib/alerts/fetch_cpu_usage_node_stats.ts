/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { AlertCluster, AlertCpuUsageNodeStats } from '../../alerts/types';

export async function fetchCpuUsageNodeStats(
  callCluster: any,
  clusters: AlertCluster[],
  index: string,
): Promise<AlertCpuUsageNodeStats[]> {
  const filterPath = [
    'hits.hits._source.node_stats.node_id',
    'hits.hits._source.source_node.name',
    'hits.hits._source.cluster_uuid',
    'hits.hits._source.node_stats.os.cgroup.cpuacct.usage_nanos',
    'hits.hits._source.node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
    'hits.hits._source.node_stats.os.cgroup.cpu.cfs_quota_micros',
    'hits.hits._source.node_stats.process.cpu.percent',
  ];
  const params = {
    index,
    filterPath,
    body: {
      size: 1000, // TODO: figure this out
      sort: [
        {
          timestamp: {
            order: 'desc',
          },
        },
      ],
      query: {
        bool: {
          filter: [
            {
              terms: {
                cluster_uuid: clusters.map(cluster => cluster.clusterUuid),
              },
            },
            {
              term: {
                type: 'node_stats',
              },
            },
          ],
        },
      },
      collapse: {
        field: 'node_stats.node_id',
      },
    },
  };

  const response = await callCluster('search', params);
  return get(response, 'hits.hits', []).map(hit => {
    return {
      clusterUuid: get(hit, '_source.cluster_uuid'),
      nodeId: get(hit, '_source.node_stats.node_id'),
      nodeName: get(hit, '_source.source_node.name'),
      cpuUsage: get(hit, '_source.node_stats.process.cpu.percent', 0),
      containerUsage: get(hit, '_source.node_stats.os.cgroup.cpuacct.usage_nanos', 0),
      containerPeriods: get(
        hit,
        '_source.node_stats.os.cgroup.cpu.stat.number_of_elapsed_periods',
        0
      ),
      containerQuota: get(hit, '_source.node_stats.os.cgroup.cpu.cfs_quota_micros', 0),
    } as AlertCpuUsageNodeStats;
  });
}
