/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint import/namespace: ['error', { allowComputed: true }]*/

import { MonitoringConfig } from '../config';
import { decorateDebugServer } from '../debug_logger';
import { RouteDependencies } from '../types';
// @ts-ignore
import * as uiRoutes from './api/v1/ui'; // namespace import

export function requireUIRoutes(
  _server: any,
  config: MonitoringConfig,
  npRoute: RouteDependencies
) {
  const routes = Object.keys(uiRoutes);
  const server = config.ui.debug_mode
    ? decorateDebugServer(_server, config, npRoute.logger)
    : _server;

  routes.forEach((route) => {
    const registerRoute = uiRoutes[route]; // computed reference to module objects imported via namespace
    registerRoute(server, npRoute);
  });
}
