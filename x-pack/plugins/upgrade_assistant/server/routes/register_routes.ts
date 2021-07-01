/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteDependencies } from '../types';

import { registerClusterCheckupRoutes } from './cluster_checkup';
import { registerDeprecationLoggingRoutes } from './deprecation_logging';
import { registerReindexIndicesRoutes } from './reindex_indices';
import { registerTelemetryRoutes } from './telemetry';
import { registerUpdateSettingsRoute } from './update_index_settings';
import { registerMlSnapshotRoutes } from './ml_snapshots';
import { ReindexWorker } from '../lib/reindexing';

export function registerRoutes(dependencies: RouteDependencies, getWorker: () => ReindexWorker) {
  registerClusterCheckupRoutes(dependencies);
  registerDeprecationLoggingRoutes(dependencies);
  registerReindexIndicesRoutes(dependencies, getWorker);
  registerTelemetryRoutes(dependencies);
  registerUpdateSettingsRoute(dependencies);
  registerMlSnapshotRoutes(dependencies);
}
