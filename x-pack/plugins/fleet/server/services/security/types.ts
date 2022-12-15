/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfig, RouteMethod } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { IRouter, RequestHandler } from '@kbn/core/server';

import type { FleetRequestHandlerContext } from '../..';

import type { FleetAuthz } from '../../../common';

/** The values allowed for the `fleetAuthz` property of the Fleet Router registration interface. */
type FleetAuthzRouterConfigParam = FleetAuthzRequirements | ((userAuthz: FleetAuthz) => boolean);

type FleetAuthzRouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
> = <P, Q, B>(
  route: FleetRouteConfig<P, Q, B, Method>,
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

export interface FleetAuthzRouteConfig<
  T extends FleetAuthzRouterConfigParam = FleetAuthzRouterConfigParam
> {
  fleetAuthz?: T;
}

export type FleetRouteConfig<P, Q, B, Method extends RouteMethod> = RouteConfig<P, Q, B, Method> &
  FleetAuthzRouteConfig;

// Fleet router that allow to add required access when registering route
export interface FleetAuthzRouter<
  TContext extends FleetRequestHandlerContext = FleetRequestHandlerContext
> extends IRouter<TContext> {
  get: FleetAuthzRouteRegistrar<'get', TContext>;
  delete: FleetAuthzRouteRegistrar<'delete', TContext>;
  post: FleetAuthzRouteRegistrar<'post', TContext>;
  put: FleetAuthzRouteRegistrar<'put', TContext>;
  patch: FleetAuthzRouteRegistrar<'patch', TContext>;
}

type DeepPartialTruthy<T> = {
  [P in keyof T]?: T[P] extends boolean ? true : DeepPartialTruthy<T[P]>;
};

/**
 * The set of authz properties required to be granted access to an API route
 */
export type FleetAuthzRequirements = DeepPartialTruthy<FleetAuthz>;

/**
 * Interface used for registering and calculating authorization for a Fleet API routes
 */
export type FleetRouteRequiredAuthz = Partial<{
  any: FleetAuthzRequirements;
  all: FleetAuthzRequirements;
}>;
