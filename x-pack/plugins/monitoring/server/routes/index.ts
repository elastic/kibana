/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitoringConfig } from '../config';
import { decorateDebugServer } from '../debug_logger';
import { MonitoringCore, RouteDependencies } from '../types';
import {
  registerV1AlertRoutes,
  registerV1ApmRoutes,
  registerV1BeatsRoutes,
  registerV1CheckAccessRoutes,
  registerV1ClusterRoutes,
  registerV1ElasticsearchRoutes,
  registerV1ElasticsearchSettingsRoutes,
  registerV1EnterpriseSearchRoutes,
  registerV1LogstashRoutes,
  registerV1SetupRoutes,
  registerV1KibanaRoutes,
} from './api/v1';

export function requireUIRoutes(
  server: MonitoringCore,
  config: MonitoringConfig,
  npRoute: RouteDependencies
) {
  const decoratedServer = config.ui.debug_mode
    ? decorateDebugServer(server, config, npRoute.logger)
    : server;

  registerV1AlertRoutes(decoratedServer, npRoute);
  registerV1ApmRoutes(server);
  registerV1BeatsRoutes(server);
  registerV1CheckAccessRoutes(server);
  registerV1ClusterRoutes(server);
  registerV1ElasticsearchRoutes(server);
  registerV1ElasticsearchSettingsRoutes(server, npRoute);
  registerV1EnterpriseSearchRoutes(server);
  registerV1LogstashRoutes(server);
  registerV1SetupRoutes(server);
  registerV1KibanaRoutes(server);
}
