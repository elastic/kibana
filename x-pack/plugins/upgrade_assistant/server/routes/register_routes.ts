/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { ReindexWorker } from '../lib/reindexing';
import { registerAppRoutes } from './app';
import { registerCloudBackupStatusRoutes } from './cloud_backup_status';
import { registerClusterSettingsRoute } from './cluster_settings';
import { registerClusterUpgradeStatusRoutes } from './cluster_upgrade_status';
import { registerDeprecationLoggingRoutes } from './deprecation_logging';
import { registerESDeprecationRoutes } from './es_deprecations';
import { registerMlSnapshotRoutes } from './ml_snapshots';
import { registerNodeDiskSpaceRoute } from './node_disk_space';
import { registerBatchReindexIndicesRoutes, registerReindexIndicesRoutes } from './reindex_indices';
import { registerRemoteClustersRoute } from './remote_clusters';
import { registerUpgradeStatusRoute } from './status';
import { registerSystemIndicesMigrationRoutes } from './system_indices_migration';
import { registerUpdateSettingsRoute } from './update_index_settings';

export function registerRoutes(dependencies: RouteDependencies, getWorker: () => ReindexWorker) {
  registerAppRoutes(dependencies);
  registerCloudBackupStatusRoutes(dependencies);
  registerClusterUpgradeStatusRoutes(dependencies);
  registerSystemIndicesMigrationRoutes(dependencies);
  registerESDeprecationRoutes(dependencies);
  registerDeprecationLoggingRoutes(dependencies);
  registerReindexIndicesRoutes(dependencies, getWorker);
  registerBatchReindexIndicesRoutes(dependencies, getWorker);
  registerUpdateSettingsRoute(dependencies);
  registerMlSnapshotRoutes(dependencies);
  // Route for cloud to retrieve the upgrade status for ES and Kibana
  registerUpgradeStatusRoute(dependencies);
  registerRemoteClustersRoute(dependencies);
  registerNodeDiskSpaceRoute(dependencies);
  registerClusterSettingsRoute(dependencies);
}
