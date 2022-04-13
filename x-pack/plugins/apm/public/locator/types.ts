/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Route, RouteMap, TypeOf } from '@kbn/typed-react-router-config';
import { ValuesType, UnionToIntersection } from 'utility-types';
import { ApmRoutes } from '../components/routing/apm_route_config';

export type PickLocatorEnabledRoutes<TRouteMap extends RouteMap = RouteMap> =
  UnionToIntersection<
    ValuesType<{
      [key in keyof TRouteMap]: MapRoute<TRouteMap[key], key>;
    }>
  >;

type MapRoute<
  TRoute extends Route,
  TPath extends PropertyKey
> = TRoute extends { children: RouteMap }
  ? PickLocatorEnabledRoutes<TRoute['children']>
  : PickLocatorEnabledRoute<TRoute, TPath>;

type PickLocatorEnabledRoute<
  TRoute extends Route,
  TPath extends PropertyKey
> = TRoute extends {
  locatorPageId: string;
}
  ? {
      [key in TRoute['locatorPageId']]: TRoute & { path: TPath } & {
        defaults: Route['defaults'];
      };
    }
  : {};

export type LocatorEnabledRoutesOnly = PickLocatorEnabledRoutes<ApmRoutes>;

export type APMLocatorPayload = ValuesType<{
  [Key in keyof LocatorEnabledRoutesOnly]: Merge<
    {
      pageId: Key;
    },
    RouteParams<Key> extends { path: infer TPath } ? { params: TPath } : {},
    RouteParams<Key> extends { query?: infer TQuery }
      ? { query?: Partial<TQuery> }
      : {}
  >;
}>;

type RouteParams<TKey extends keyof LocatorEnabledRoutesOnly> = TypeOf<
  ApmRoutes,
  LocatorEnabledRoutesOnly[TKey]['path'],
  false
>;

type Merge<
  T extends Record<string, unknown>,
  U extends Record<string, unknown>,
  D extends Record<string, unknown> = {}
> = T & U & D;

export type LinkFunc = (payload: APMLocatorPayload) => string;

export type LocatorRoutePayload<TPageId extends APMLocatorPayload['pageId']> =
  APMLocatorPayload extends infer TPayload
    ? TPayload extends APMLocatorPayload
      ? TPayload['pageId'] extends TPageId
        ? TPayload
        : never
      : never
    : never;
