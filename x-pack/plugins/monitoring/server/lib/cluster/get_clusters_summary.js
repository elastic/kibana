/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, omit } from 'lodash';
import { calculateOverallStatus } from '../calculate_overall_status';

export function getClustersSummary(clusters, kibanaUuid) {
  return clusters.map(cluster => {
    const {
      isSupported,
      cluster_uuid: clusterUuid,
      cluster_name: clusterName,
      version,
      license,
      cluster_stats: clusterStats,
      logstash,
      kibana,
      ml,
      beats,
      apm,
      alerts
    } = cluster;

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
    const { status } = cluster.cluster_state;

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
