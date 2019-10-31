/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PureComponent } from 'react';
import { toAsyncComponent } from './to_async_component';

const ShowLanding = toAsyncComponent(
  async () =>
    ((await import(/* webpackChunkName: "landing" */ '../application/landing'))
      .LandingPage as unknown) as PureComponent
);

const ShowEndpoints = toAsyncComponent(
  async () =>
    ((await import(/* webpackChunkName: "endpoints" */ '../application/endpoints'))
      .EndpointsPage as unknown) as PureComponent
);

const ShowAlerts = toAsyncComponent(
  async () =>
    ((await import(/* webpackChunkName: "alerts" */ '../application/alerts'))
      .AlertsPage as unknown) as PureComponent
);

export const routePaths = [
  {
    name: 'Home',
    id: 'home',
    path: '/',
    exact: true,
    component: ShowLanding,
  },
  {
    name: 'Endpoints',
    id: 'endpoints',
    path: '/endpoints',
    exact: false,
    component: ShowEndpoints,
  },
  {
    name: 'Alerts',
    id: 'alerts',
    path: '/alerts',
    exact: true,
    component: ShowAlerts,
  },
];

export const routePathsById = routePaths.reduce((pathsById, routePath) => {
  pathsById[routePath.id] = routePath;
  return pathsById;
}, {});
