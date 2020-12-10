/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { Route, RouteParamsRT } from './typings';

export function createRoute<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined = undefined,
  TReturn = unknown
>(
  route: Route<TEndpoint, TRouteParamsRT, TReturn>
): Route<TEndpoint, TRouteParamsRT, TReturn>;

export function createRoute<
  TEndpoint extends string,
  TRouteParamsRT extends RouteParamsRT | undefined = undefined,
  TReturn = unknown
>(
  route: (core: CoreSetup) => Route<TEndpoint, TRouteParamsRT, TReturn>
): (core: CoreSetup) => Route<TEndpoint, TRouteParamsRT, TReturn>;

export function createRoute(routeOrFactoryFn: Function | object) {
  return routeOrFactoryFn;
}
