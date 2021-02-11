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
  const clusterStats = cluster.elasticsearch?.cluster?.stats ?? cluster.cluster_stats ?? {};
  const clusterNodes = clusterStats.nodes ?? {};
  const clusterIndices = clusterStats.indices ?? {};

  const clusterTotalShards = clusterIndices.shards?.count ?? clusterIndices.shards?.total ?? 0;
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
    indicesCount: clusterIndices.total ?? clusterIndices.count ?? 0,
    documentCount: clusterIndices.docs?.total ?? clusterIndices.docs?.count ?? 0,
    dataSize: clusterIndices.store?.size.bytes ?? clusterIndices.store?.size_in_bytes ?? 0,
    // node-based stats
    nodesCount: clusterNodes.count?.total ?? clusterNodes.count ?? 0,
    upTime: clusterNodes.jvm?.max_uptime?.ms ?? lusterNodes.jvm?.max_uptime_in_millis ?? 0,
    version: clusterNodes.versions ?? null,
    memUsed:
      clusterNodes.jvm?.memory?.heap?.used?.bytes ?? clusterNodes.jvm?.mem?.heap_used_in_bytes ?? 0,
    memMax:
      clusterNodes.jvm?.memory?.heap?.max?.bytes ?? clusterNodes.jvm?.mem?.heap_max_in_bytes ?? 0,
    unassignedShards: unassignedShardsTotal,
    totalShards,
  };
}
