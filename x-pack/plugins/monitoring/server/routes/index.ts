/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint import/namespace: ['error', { allowComputed: true }]*/

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
  registerV1LogstashRoutes,
  registerV1SetupRoutes,
  registerV1KibanaRoutes,
} from './api/v1';
import * as uiRoutes from './api/v1/ui';

export function requireUIRoutes(
  server: MonitoringCore,
  config: MonitoringConfig,
  npRoute: RouteDependencies
) {
  const routes = Object.keys(uiRoutes);
  const decoratedServer = config.ui.debug_mode
    ? decorateDebugServer(server, config, npRoute.logger)
    : server;

  routes.forEach((route) => {
    // @ts-expect-error
    const registerRoute = uiRoutes[route]; // computed reference to module objects imported via namespace
    registerRoute(server, npRoute);
  });

  registerV1AlertRoutes(decoratedServer, npRoute);
  registerV1ApmRoutes(server);
  registerV1BeatsRoutes(server);
  registerV1CheckAccessRoutes(server);
  registerV1ClusterRoutes(server);
  registerV1ElasticsearchRoutes(server);
  registerV1ElasticsearchSettingsRoutes(server, npRoute);
  registerV1LogstashRoutes(server);
  registerV1SetupRoutes(server);
  registerV1KibanaRoutes(server);
}
