/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PureComponent } from 'react';
import { toAsyncComponent } from './to_async_component';

const ShowLanding = toAsyncComponent(
  async () => ((await import('../application/landing')).LandingPage as unknown) as PureComponent
);

const ShowEndpoints = toAsyncComponent(
  async () => ((await import('../application/endpoints')).EndpointsPage as unknown) as PureComponent
);

const ShowAlerts = toAsyncComponent(
  async () => ((await import('../application/alerts')).AlertsPage as unknown) as PureComponent
);

export const routePaths = [
  {
    name: 'Home',
    id: 'home',
    path: '/',
    component: ShowLanding,
  },
  {
    name: 'Endpoints',
    id: 'endpoints',
    path: '/endpoints',
    component: ShowEndpoints,
  },
  {
    name: 'Alerts',
    id: 'alerts',
    path: '/alerts',
    component: ShowAlerts,
  },
];

export const routePathsById = routePaths.reduce((pathsById, routePath) => {
  pathsById[routePath.id] = routePath;
  return pathsById;
}, {});
