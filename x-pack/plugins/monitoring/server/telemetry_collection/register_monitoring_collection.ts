/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { getAllStats } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';

export function registerMonitoringCollection(telemetryCollectionManager: any) {
  telemetryCollectionManager.setCollection({
    esCluster: 'monitoring',
    title: 'monitoring',
    priority: 2,
    statsGetter: getAllStats,
    clusterDetailsGetter: getClusterUuids,
  });
}
