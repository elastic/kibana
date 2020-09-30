/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TelemetryCollectionManagerPluginSetup,
  CollectionClients,
} from 'src/plugins/telemetry_collection_manager/server';
import { getAllStats, CustomContext } from './get_all_stats';
import { getClusterUuids } from './get_cluster_uuids';
import { getLicenses } from './get_licenses';

export function registerMonitoringCollection(
  telemetryCollectionManager: TelemetryCollectionManagerPluginSetup,
  collectionClients: CollectionClients,
  customContext: CustomContext
) {
  telemetryCollectionManager.setCollection({
    collectionClients,
    title: 'monitoring',
    priority: 2,
    statsGetter: getAllStats,
    clusterDetailsGetter: getClusterUuids,
    licenseGetter: getLicenses,
    customContext,
  });
}
