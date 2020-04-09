/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/*
 * @param cluster {Object} clusterStats from getClusterStatus
 * @param unassignedShards {Object} shardStats from getShardStats
 * @return top-level cluster summary data
 */
export function getClusterStatus(cluster, shardStats) {
  const clusterStats = get(cluster, 'cluster_stats', {});
  const clusterNodes = get(clusterStats, 'nodes', {});
  const clusterIndices = get(clusterStats, 'indices', {});

  const clusterTotalShards = get(clusterIndices, 'shards.total', 0);
  let unassignedShardsTotal = 0;
  const unassignedShards = get(shardStats, 'indicesTotals.unassigned');
  if (unassignedShards !== undefined) {
    const { replica, primary } = unassignedShards;
    unassignedShardsTotal = replica + primary || 0; // replica + primary will be NaN if unassignedShards is not passed
  }
  const totalShards = clusterTotalShards + unassignedShardsTotal;

  return {
    status: get(cluster, 'cluster_state.status', 'unknown'),
    // index-based stats
    indicesCount: get(clusterIndices, 'count', 0),
    documentCount: get(clusterIndices, 'docs.count', 0),
    dataSize: get(clusterIndices, 'store.size_in_bytes', 0),
    // node-based stats
    nodesCount: get(clusterNodes, 'count.total', 0),
    upTime: get(clusterNodes, 'jvm.max_uptime_in_millis', 0),
    version: get(clusterNodes, 'versions', null),
    memUsed: get(clusterNodes, 'jvm.mem.heap_used_in_bytes', 0),
    memMax: get(clusterNodes, 'jvm.mem.heap_max_in_bytes', 0),
    unassignedShards: unassignedShardsTotal,
    totalShards,
  };
}
