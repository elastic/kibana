/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, omit, get } from 'lodash';
import { calculateOverallStatus } from '../calculate_overall_status';
import { LOGGING_TAG } from '../../../common/constants';
import { MonitoringLicenseError } from '../errors/custom_errors';

export function getClustersSummary(server, clusters, kibanaUuid, isCcrEnabled) {
  return clusters.map((cluster) => {
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
      cluster_settings: clusterSettings,
      logs,
    } = cluster;

    const clusterName = get(clusterSettings, 'cluster.metadata.display_name', cluster.cluster_name);

    // check for any missing licenses
    if (!license) {
      const clusterId = cluster.name || clusterName || clusterUuid;
      server.log(
        ['error', LOGGING_TAG],
        "Could not find license information for cluster = '" +
          clusterId +
          "'. " +
          "Please check the cluster's master node server logs for errors or warnings."
      );
      throw new MonitoringLicenseError(clusterId);
    }

    const {
      status: licenseStatus,
      type: licenseType,
      expiry_date_in_millis: licenseExpiry,
    } = license;

    const indices = pick(clusterStats.indices, ['count', 'docs', 'shards', 'store']);

    const jvm = {
      max_uptime_in_millis: clusterStats.nodes.jvm.max_uptime_in_millis,
      mem: clusterStats.nodes.jvm.mem,
    };

    const nodes = {
      fs: clusterStats.nodes.fs,
      count: {
        total: clusterStats.nodes.count.total,
      },
      jvm,
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
        expiry_date_in_millis: licenseExpiry,
      },
      elasticsearch: {
        cluster_stats: {
          indices,
          nodes,
          status,
        },
        logs,
      },
      logstash,
      kibana: omit(kibana, 'uuids'),
      ml,
      ccs,
      beats,
      apm,
      alerts,
      isPrimary: kibana ? kibana.uuids.includes(kibanaUuid) : false,
      status: calculateOverallStatus([status, (kibana && kibana.status) || null]),
      isCcrEnabled,
    };
  });
}
