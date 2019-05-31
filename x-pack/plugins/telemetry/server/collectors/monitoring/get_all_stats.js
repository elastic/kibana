/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set, merge } from 'lodash';

import { constants } from '../../';
import { getClusterUuids } from './get_cluster_uuids';
import { getElasticsearchStats } from './get_es_stats';
import { getKibanaStats } from './get_kibana_stats';
import { getBeatsStats } from './get_beats_stats';
import { getHighLevelStats } from './get_high_level_stats';


/**
 * Get statistics for all products joined by Elasticsearch cluster.
 *
 * @param {Object} req The incoming request
 * @param {Date} start The starting range to request data
 * @param {Date} end The ending range to request data
 * @return {Promise} The array of clusters joined with the Kibana and Logstash instances.
 */
export function getAllStats(req, start, end, { useInternalUser = false } = {}) {
  const server = req.server;
  const { callWithRequest, callWithInternalUser } = server.plugins.elasticsearch.getCluster('monitoring');
  const callCluster = useInternalUser ? callWithInternalUser : (...args) => callWithRequest(req, ...args);

  return getAllStatsWithCaller(server, callCluster, start, end);
}

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 *
 * @param {Object} server The server instance used to call ES as the internal user
 * @param {Date} start The starting range to request data
 * @param {Date} end The ending range to request data
 * @return {Promise} The array of clusters joined with the Kibana and Logstash instances.
 */
export function getAllStatsForServer(server, start, end) {
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('monitoring');

  return getAllStatsWithCaller(server, callWithInternalUser, start, end);
}

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 *
 * @param {Object} server The Kibana server instance used to call ES as the internal user
 * @param {function} callCluster The callWithRequest or callWithInternalUser handler
 * @param {Date} start The starting range to request data
 * @param {Date} end The ending range to request data
 * @return {Promise} The array of clusters joined with the Kibana and Logstash instances.
 */
function getAllStatsWithCaller(server, callCluster, start, end) {
  return getClusterUuids(server, callCluster, start, end)
    .then(clusterUuids => {
    // don't bother doing a further lookup
      if (clusterUuids.length === 0) {
        return [];
      }

      return Promise.all([
        getElasticsearchStats(server, callCluster, clusterUuids),           // cluster_stats, stack_stats.xpack, cluster_name/uuid, license, version
        getKibanaStats(server, callCluster, clusterUuids, start, end),      // stack_stats.kibana
        getHighLevelStats(server, callCluster, clusterUuids, start, end, constants.LOGSTASH_SYSTEM_ID), // stack_stats.logstash
        getBeatsStats(server, callCluster, clusterUuids, start, end),      // stack_stats.beats
      ])
        .then(([esClusters, kibana, logstash, beats]) => handleAllStats(esClusters, { kibana, logstash, beats }));
    });
}

/**
 * Combine the statistics from the stack to create "cluster" stats that associate all products together based on the cluster
 * that is attached.
 *
 * @param {Array} clusters The Elasticsearch clusters
 * @param {Object} kibana The Kibana instances keyed by Cluster UUID
 * @param {Object} logstash The Logstash nodes keyed by Cluster UUID
 * @return {Array} The clusters joined with the Kibana and Logstash instances under each cluster's {@code stack_stats}.
 */
export function handleAllStats(clusters, { kibana, logstash,  beats }) {
  return clusters.map(cluster => {
    // if they are using Kibana or Logstash, then add it to the cluster details under cluster.stack_stats
    addStackStats(cluster, kibana, constants.KIBANA_SYSTEM_ID);
    addStackStats(cluster, logstash, constants.LOGSTASH_SYSTEM_ID);
    addStackStats(cluster, beats, constants.BEATS_SYSTEM_ID);
    mergeXPackStats(cluster, kibana, 'graph_workspace', 'graph'); // copy graph_workspace info out of kibana, merge it into stack_stats.xpack.graph

    return cluster;
  });
}

/**
 * Add product data to the {@code cluster}, only if it exists for the current {@code cluster}.
 *
 * @param {Object} cluster The current Elasticsearch cluster stats
 * @param {Object} allProductStats Product stats, keyed by Cluster UUID
 * @param {String} product The product name being added (e.g., 'kibana' or 'logstash')
 */
export function addStackStats(cluster, allProductStats, product) {
  const productStats = get(allProductStats, cluster.cluster_uuid);

  // Don't add it if they're not using (or configured to report stats) this product for this cluster
  if (productStats) {
    if (!cluster.stack_stats) {
      cluster.stack_stats = { };
    }

    cluster.stack_stats[product] = productStats;
  }
}

export function mergeXPackStats(cluster, allProductStats, path, product) {
  const productStats = get(allProductStats, cluster.cluster_uuid + '.' + path);

  if (productStats || productStats === 0) {
    if (!get(cluster, 'stack_stats.xpack')) {
      set(cluster, 'stack_stats.xpack', {});
    }

    const mergeStats = {};
    set(mergeStats, path, productStats);

    // merge existing data with new stats
    cluster.stack_stats.xpack[product] = cluster.stack_stats.xpack[product] || {};
    merge(cluster.stack_stats.xpack[product], mergeStats);
  }
}
