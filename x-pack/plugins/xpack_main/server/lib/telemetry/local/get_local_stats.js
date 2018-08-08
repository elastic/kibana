/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, omit } from 'lodash';
import { getClusterInfo } from './get_cluster_info';
import { getClusterStats } from './get_cluster_stats';
import { getXPack } from './get_xpack';

/**
 * Handle the separate local calls by combining them into a single object response that looks like the
 * "cluster_stats" document from X-Pack monitoring.
 *
 * @param {Object} clusterInfo Cluster info (GET /)
 * @param {Object} clusterStats Cluster stats (GET /_cluster/stats)
 * @param {Object} xpack License and X-Pack details
 * @return {Object} A combined object containing the different responses.
 */
export function handleLocalStats(clusterInfo, clusterStats, xpack) {
  return {
    timestamp: (new Date()).toISOString(),
    cluster_uuid: get(clusterInfo, 'cluster_uuid'),
    cluster_name: get(clusterInfo, 'cluster_name'),
    version: get(clusterInfo, 'version.number'),
    cluster_stats: omit(clusterStats, '_nodes', 'cluster_name'),
    collection: 'local',
    ...xpack
  };
}

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 *
 * @param {Object} server The Kibana server instance used to call ES as the internal user
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The object containing the current Elasticsearch cluster's telemetry.
 */
export function getLocalStatsWithCaller(callCluster) {
  return Promise.all([
    getClusterInfo(callCluster),  // cluster info
    getClusterStats(callCluster), // cluster stats (not to be confused with cluster _state_)
    getXPack(callCluster),        // license, stack_stats
  ])
    .then(([clusterInfo, clusterStats, xpack]) => handleLocalStats(clusterInfo, clusterStats, xpack));
}

/**
 * Get statistics for the connected Elasticsearch cluster.
 *
 * @param {Object} req The incoming request
 * @return {Promise} The cluster object containing telemetry.
 */
export function getLocalStats(req) {
  const { callWithInternalUser } = req.server.plugins.elasticsearch.getCluster('data');

  return getLocalStatsWithCaller(callWithInternalUser);
}
