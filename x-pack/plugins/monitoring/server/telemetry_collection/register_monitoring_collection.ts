/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ICustomClusterClient } from 'kibana/server';
import { Cluster } from 'src/legacy/core_plugins/elasticsearch';
// @ts-ignore
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';
import { getLicenses } from './get_licenses';

export function registerMonitoringCollection(
  cluster: ICustomClusterClient,
  telemetryCollectionManager: any
) {
  // Create a legacy wrapper since telemetry is still in the legacy plugins
  const legacyCluster: Cluster = {
    callWithRequest: async (req: any, endpoint: string, params: any) =>
      cluster.asScoped(req).callAsCurrentUser(endpoint, params),
    callWithInternalUser: (endpoint: string, params: any) =>
      cluster.callAsInternalUser(endpoint, params),
  };
  telemetryCollectionManager.setCollection({
    esCluster: legacyCluster,
    title: 'monitoring',
    priority: 2,
    statsGetter: getAllStats,
    clusterDetailsGetter: getClusterUuids,
    licenseGetter: getLicenses,
  });
}
