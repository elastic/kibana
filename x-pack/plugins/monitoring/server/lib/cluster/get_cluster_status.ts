/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ElasticsearchSource } from '../../../common/types/es';

/*
 * @param cluster {Object} clusterStats from getClusterStatus
 * @param unassignedShards {Object} shardStats from getShardStats
 * @return top-level cluster summary data
 */
export function getClusterStatus(cluster: ElasticsearchSource, shardStats: unknown) {
  const clusterStatsLegacy = cluster.cluster_stats;
  const clusterStatsMB = cluster.elasticsearch?.cluster?.stats;

  const clusterTotalShards =
    clusterStatsLegacy?.indices?.shards?.total ?? clusterStatsMB?.indices?.shards?.count ?? 0;
  let unassignedShardsTotal = 0;
  const unassignedShards = get(shardStats, 'indicesTotals.unassigned');
  if (unassignedShards !== undefined) {
    const { replica, primary } = unassignedShards;
    unassignedShardsTotal = replica + primary || 0; // replica + primary will be NaN if unassignedShards is not passed
  }
  const totalShards = clusterTotalShards + unassignedShardsTotal;

  return {
    status:
      cluster.elasticsearch?.cluster?.stats?.status ?? cluster.cluster_state?.status ?? 'unknown',
    // index-based stats
    indicesCount: clusterStatsLegacy?.indices?.count ?? clusterStatsMB?.indices?.total ?? 0,
    documentCount:
      clusterStatsLegacy?.indices?.docs?.count ?? clusterStatsMB?.indices?.docs?.total ?? 0,
    dataSize:
      clusterStatsMB?.indices?.store?.size?.bytes ??
      clusterStatsLegacy?.indices?.store?.size_in_bytes ??
      0,
    // node-based stats
    nodesCount: clusterStatsLegacy?.nodes?.count?.total ?? clusterStatsMB?.nodes?.count ?? 0,
    upTime:
      clusterStatsMB?.nodes?.jvm?.max_uptime?.ms ??
      clusterStatsLegacy?.nodes?.jvm?.max_uptime_in_millis ??
      0,
    version: clusterStatsMB?.nodes?.versions ?? clusterStatsLegacy?.nodes?.versions ?? null,
    memUsed:
      clusterStatsMB?.nodes?.jvm?.memory?.heap?.used?.bytes ??
      clusterStatsLegacy?.nodes?.jvm?.mem?.heap_used_in_bytes ??
      0,
    memMax:
      clusterStatsMB?.nodes?.jvm?.memory?.heap?.max?.bytes ??
      clusterStatsLegacy?.nodes?.jvm?.mem?.heap_max_in_bytes ??
      0,
    unassignedShards: unassignedShardsTotal,
    totalShards,
  };
}
