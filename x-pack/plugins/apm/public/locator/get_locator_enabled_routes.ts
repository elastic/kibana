/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Route, RouteWithPath } from '@kbn/typed-react-router-config';
import { merge } from 'lodash';
import { ApmRoutes } from '../components/routing/apm_route_config';
import { PickLocatorEnabledRoutes } from './types';

export const getLocatorEnabledRoutes = (routes: ApmRoutes) => {
  const locatorEnabledRoutes = Object.fromEntries(
    Object.entries(routes)
      .flatMap((aRouteEntry) => getLocatorEnabledRoutesRec(aRouteEntry))
      .filter((anArray) => anArray.length)
  ) as PickLocatorEnabledRoutes<ApmRoutes>;

  return locatorEnabledRoutes;
};

function getLocatorEnabledRoutesRec(
  [path, route]: [string, Route],
  ancestorRoutes: Route[] = []
): Array<[string, RouteWithPath]> {
  if (route.children) {
    type RouterEntries = Array<[string, RouteWithPath]>;

    const childAncestorRoutes = ancestorRoutes.concat(route);

    const matchedRoutes = Object.entries(route.children).reduce<RouterEntries>(
      (acc, aRouteEntry) =>
        acc.concat(
          getLocatorEnabledRoutesRec(aRouteEntry, childAncestorRoutes)
        ),
      []
    );
    return matchedRoutes;
  } else {
    if (route.locatorPageId) {
      const routesDefaultParams = ancestorRoutes
        .concat(route)
        .map((aRoute) => aRoute.defaults)
        .filter(Boolean);
      const defaultParams = merge({}, ...routesDefaultParams);

      return [
        [route.locatorPageId, { ...route, path, defaults: defaultParams }],
      ];
    }
    return [];
  }
}
