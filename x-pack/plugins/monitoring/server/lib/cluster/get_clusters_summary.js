/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, omit, get } from 'lodash';
import { calculateOverallStatus } from '../calculate_overall_status';

export function getClustersSummary(clusters, kibanaUuid) {
  return clusters.map(cluster => {
    const {
      isSupported,
      cluster_uuid: clusterUuid,
      version,
      license,
      cluster_stats: clusterStats,
      logstash,
      kibana,
      ml,
      beats,
      apm,
      alerts,
      ccs,
      cluster_settings: clusterSettings
    } = cluster;

    const clusterName = get(clusterSettings, 'cluster.metadata.display_name', cluster.cluster_name);

    const {
      status: licenseStatus,
      type: licenseType,
      expiry_date_in_millis: licenseExpiry
    } = license;

    const indices = pick(clusterStats.indices, ['count', 'docs', 'shards', 'store']);

    const jvm = {
      max_uptime_in_millis: clusterStats.nodes.jvm.max_uptime_in_millis,
      mem: clusterStats.nodes.jvm.mem
    };

    const nodes = {
      fs: clusterStats.nodes.fs,
      count: {
        total: clusterStats.nodes.count.total
      },
      jvm
    };
    // fetch the cluster status from the cluster_stats object, if it exists, and fall back to the cluster_state
    // It should exist in 100% of cluster_stats documents as long as they were upgraded via the ingest pipeline
    // (which means they were the 5.0 - 5.4 cluster_info documents). Any pre-existing cluster_stats document did
    // _not_ contain the status, and the cluster_state would not be reported in 5.0 - 5.4 when the license
    // was expired
    const status = get(cluster.cluster_stats, 'status', get(cluster.cluster_state, 'status', 'unknown'));

    return {
      isSupported,
      cluster_uuid: clusterUuid,
      cluster_name: clusterName,
      version,
      license: {
        status: licenseStatus,
        type: licenseType,
        expiry_date_in_millis: licenseExpiry
      },
      elasticsearch: {
        cluster_stats: {
          indices,
          nodes,
          status
        }
      },
      logstash,
      kibana: omit(kibana, 'uuids'),
      ml,
      ccs,
      beats,
      apm,
      alerts,
      isPrimary: kibana.uuids.includes(kibanaUuid),
      status: calculateOverallStatus([
        status,
        kibana && kibana.status || null
      ])
    };
  });
}
