/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Location } from 'history';
import type { ApmRouter } from '../routing/apm_route_config';

export function isRouteWithTimeRange({
  apmRouter,
  location,
}: {
  apmRouter: ApmRouter;
  location: Location;
}) {
  const matchingRoutes = apmRouter.getRoutesToMatch(location.pathname);
  const matchesRoute = matchingRoutes.some((route) => {
    return (
      route.path === '/services' ||
      route.path === '/traces' ||
      route.path === '/service-map' ||
      route.path === '/backends' ||
      route.path === '/services/{serviceName}' ||
      route.path === '/service-groups' ||
      location.pathname === '/' ||
      location.pathname === ''
    );
  });

  return matchesRoute;
}
