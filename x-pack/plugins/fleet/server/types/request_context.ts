/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaResponseFactory,
  RequestHandler,
  RequestHandlerContext,
  RouteMethod,
  SavedObjectsClientContract,
  IRouter,
} from '../../../../../src/core/server';

/** @internal */
export interface FleetRequestHandlerContext extends RequestHandlerContext {
  fleet: {
    epm: {
      /**
       * Saved Objects client configured to use kibana_system privileges instead of end-user privileges. Should only be
       * used by routes that have additional privilege checks for authorization (such as requiring superuser).
       */
      readonly internalSoClient: SavedObjectsClientContract;
    };
  };
}

/**
 * Convenience type for request handlers in Fleet that includes the FleetRequestHandlerContext type
 * @internal
 */
export type FleetRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = RequestHandler<P, Q, B, FleetRequestHandlerContext, Method, ResponseFactory>;

/**
 * Convenience type for routers in Fleet that includes the FleetRequestHandlerContext type
 * @internal
 */
export type FleetRouter = IRouter<FleetRequestHandlerContext>;
