/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint import/namespace: ['error', { allowComputed: true }]*/
// @ts-ignore
import * as uiRoutes from './api/v1/ui'; // namespace import
import { RouteDependencies } from '../types';

export function requireUIRoutes(server: any, npRoute: RouteDependencies) {
  const routes = Object.keys(uiRoutes);

  routes.forEach((route) => {
    const registerRoute = uiRoutes[route]; // computed reference to module objects imported via namespace
    registerRoute(server, npRoute);
  });
}
