/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IKibanaResponse,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  OnPostAuthHandler,
  RequestHandler,
  RouteMethod,
} from '@kbn/core/server';

import type { FleetRequestHandlerContext } from '../..';

import type { FleetAuthzRouteConfig, FleetAuthzRouter } from './types';
import {
  checkSecurityEnabled,
  getAuthzFromRequest,
  doesNotHaveRequiredFleetAuthz,
} from './security';

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>
): { router: FleetAuthzRouter<TContext>; onPostAuthHandler: OnPostAuthHandler } {
  const fleetAuthzOnPostAuthHandler: OnPostAuthHandler = async (_, res, toolkit) => {
    if (!checkSecurityEnabled()) {
      return res.forbidden();
    }

    return toolkit.next();
  };

  const routerAuthzWrapper = async <R extends RouteMethod>({
    context,
    request,
    response,
    handler,
    hasRequiredAuthz,
  }: {
    context: TContext;
    request: KibanaRequest;
    response: KibanaResponseFactory;
    handler: RequestHandler<any, any, any, TContext, R, KibanaResponseFactory>;
    hasRequiredAuthz?: FleetAuthzRouteConfig['fleetAuthz'];
  }): Promise<IKibanaResponse<any>> => {
    const requestedAuthz = await getAuthzFromRequest(request);

    if (doesNotHaveRequiredFleetAuthz(requestedAuthz, hasRequiredAuthz)) {
      return response.forbidden();
    }
    return handler(context, request, response);
  };

  const fleetAuthzRouter: FleetAuthzRouter<TContext> = {
    get: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.get(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    delete: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.delete(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    post: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.post(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    put: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.put(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    patch: ({ fleetAuthz: hasRequiredAuthz, ...options }, handler) => {
      router.patch(options, async (context, request, response) =>
        routerAuthzWrapper({ context, request, response, handler, hasRequiredAuthz })
      );
    },
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };

  return { router: fleetAuthzRouter, onPostAuthHandler: fleetAuthzOnPostAuthHandler };
}
