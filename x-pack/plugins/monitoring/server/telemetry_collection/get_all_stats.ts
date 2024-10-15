/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set';
import { get, merge } from 'lodash';

import moment from 'moment';
import { ElasticsearchClient } from 'kibana/server';
import {
  LOGSTASH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  USAGE_FETCH_INTERVAL,
} from '../../common/constants';
import { getElasticsearchStats, ESClusterStats } from './get_es_stats';
import { getKibanaStats, KibanaStats } from './get_kibana_stats';
import { getBeatsStats, BeatsStatsByClusterUuid } from './get_beats_stats';
import { getLogstashStats, LogstashStatsByClusterUuid } from './get_logstash_stats';

/**
 * Get statistics for all products joined by Elasticsearch cluster.
 * Returns the array of clusters joined with the Kibana and Logstash instances.
 *
 */
export async function getAllStats(
  clusterUuids: string[],
  callCluster: ElasticsearchClient,
  timestamp: number,
  maxBucketSize: number
) {
  const start = moment(timestamp).subtract(USAGE_FETCH_INTERVAL, 'ms').toISOString();
  const end = moment(timestamp).toISOString();

  const [esClusters, kibana, logstash, beats] = await Promise.all([
    getElasticsearchStats(callCluster, clusterUuids, start, end, maxBucketSize), // cluster_stats, stack_stats.xpack, cluster_name/uuid, license, version
    getKibanaStats(callCluster, clusterUuids, start, end, maxBucketSize), // stack_stats.kibana
    getLogstashStats(callCluster, clusterUuids, start, end), // stack_stats.logstash
    getBeatsStats(callCluster, clusterUuids, start, end), // stack_stats.beats
  ]);

  return handleAllStats(esClusters, { kibana, logstash, beats });
}

/**
 * Combine the statistics from the stack to create "cluster" stats that associate all products together based on the cluster
 * that is attached.
 *
 * @param {Array} clusters The Elasticsearch clusters
 * @param {Object} kibana The Kibana instances keyed by Cluster UUID
 * @param {Object} logstash The Logstash nodes keyed by Cluster UUID
 *
 * Returns the clusters joined with the Kibana and Logstash instances under each cluster's {@code stack_stats}.
 */
export function handleAllStats(
  clusters: ESClusterStats[],
  {
    kibana,
    logstash,
    beats,
  }: {
    kibana: KibanaStats;
    logstash: LogstashStatsByClusterUuid;
    beats: BeatsStatsByClusterUuid;
  }
) {
  return clusters.map((cluster) => {
    const stats = {
      ...cluster,
      stack_stats: {
        ...cluster.stack_stats,
        // if they are using Kibana or Logstash, then add it to the cluster details under cluster.stack_stats
        ...getStackStats(cluster.cluster_uuid, kibana, KIBANA_SYSTEM_ID),
        ...getStackStats(cluster.cluster_uuid, logstash, LOGSTASH_SYSTEM_ID),
        ...getStackStats(cluster.cluster_uuid, beats, BEATS_SYSTEM_ID),
      },
    };

    mergeXPackStats(stats, kibana, 'graph_workspace', 'graph'); // copy graph_workspace info out of kibana, merge it into stack_stats.xpack.graph

    return stats;
  });
}

export function getStackStats<T extends { [clusterUuid: string]: K }, K>(
  clusterUuid: string,
  allProductStats: T,
  product: string
) {
  const productStats = allProductStats[clusterUuid];
  // Don't add it if they're not using (or configured to report stats) this product for this cluster
  return productStats ? { [product]: productStats } : {};
}

export function mergeXPackStats<T extends { [clusterUuid: string]: unknown }>(
  cluster: ESClusterStats & { stack_stats?: { xpack?: { [product: string]: unknown } } },
  allProductStats: T,
  path: string,
  product: string
) {
  const productStats = get(allProductStats, cluster.cluster_uuid + '.' + path);

  if (productStats || productStats === 0) {
    if (!cluster.stack_stats) {
      cluster.stack_stats = {};
    }
    if (!cluster.stack_stats.xpack) {
      cluster.stack_stats.xpack = {};
    }

    const mergeStats = {};
    set(mergeStats, path, productStats);

    // merge existing data with new stats
    cluster.stack_stats.xpack[product] = cluster.stack_stats.xpack[product] || {};
    merge(cluster.stack_stats.xpack[product], mergeStats);
  }
}
