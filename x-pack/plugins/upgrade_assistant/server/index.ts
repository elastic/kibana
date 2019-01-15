/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { makeUpgradeAssistantUsageCollector } from './lib/telemetry';
import { registerClusterCheckupRoutes } from './routes/cluster_checkup';
import { registerDeprecationLoggingRoutes } from './routes/deprecation_logging';
import { registerTelemetryRoutes } from './routes/telemetry';

export function initServer(server: Legacy.Server) {
  registerClusterCheckupRoutes(server);
  registerDeprecationLoggingRoutes(server);
  registerTelemetryRoutes(server);
  makeUpgradeAssistantUsageCollector(server);
}
