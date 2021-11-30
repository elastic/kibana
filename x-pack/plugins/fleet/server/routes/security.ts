/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  RouteConfig,
  RouteMethod,
  KibanaRequest,
  RequestHandler,
  RequestHandlerContext,
  OnPostAuthHandler,
} from 'src/core/server';

import type { FleetAuthz } from '../../common';
import { calculateAuthz } from '../../common';

import { appContextService } from '../services';
import type { FleetRequestHandlerContext } from '../types';

const SUPERUSER_AUTHZ_MESSAGE =
  'Access to Fleet API requires the superuser role and for stack security features to be enabled.';

function checkSecurityEnabled() {
  return appContextService.hasSecurity() && appContextService.getSecurityLicense().isEnabled();
}

function checkSuperuser(req: KibanaRequest) {
  if (!checkSecurityEnabled()) {
    return false;
  }

  const security = appContextService.getSecurity();
  const user = security.authc.getCurrentUser(req);
  if (!user) {
    return false;
  }

  const userRoles = user.roles || [];
  if (!userRoles.includes('superuser')) {
    return false;
  }

  return true;
}

function isSuperuser(req: KibanaRequest) {
  return checkSuperuser(req);
}

export async function getAuthzFromRequest(req: KibanaRequest): Promise<FleetAuthz> {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const { privileges } = await checkPrivileges({
      kibana: [
        security.authz.actions.api.get('fleet-all'),
        security.authz.actions.api.get('fleet-setup'),
        security.authz.actions.api.get('integrations-all'),
        security.authz.actions.api.get('integrations-read'),
      ],
    });

    const [fleetAll, fleetSetup, intAll, intRead] = privileges.kibana;

    return calculateAuthz({
      fleet: {
        all: fleetAll.authorized,
        setup: fleetSetup.authorized,
      },

      integrations: {
        all: intAll.authorized,
        read: intRead.authorized,
      },
    });
  }

  return calculateAuthz({
    fleet: {
      all: true,
      setup: true,
    },

    integrations: {
      all: true,
      read: true,
    },
  });
}

function hasRequiredFleetAuthzPrivilege(
  authz: FleetAuthz,
  {
    fleetAuthz,
    fleetAllowFleetSetupPrivilege,
  }: { fleetAuthz?: FleetAuthzRouteConfig; fleetAllowFleetSetupPrivilege?: boolean }
): boolean {
  if (!checkSecurityEnabled()) {
    return false;
  }

  if (fleetAllowFleetSetupPrivilege) {
    // Temporary while agent call the setup API
    if (authz.fleet.setup) {
      return true;
    }
  }

  const missingAuthz = [];

  if (fleetAuthz && typeof fleetAuthz.fleet !== 'undefined') {
    for (const key of fleetAuthz.fleet) {
      if (!authz.fleet[key as keyof FleetAuthz['fleet']]) {
        missingAuthz.push(`fleet.${key}`);
      }
    }
  }

  if (fleetAuthz && typeof fleetAuthz.integrations !== 'undefined') {
    for (const key of fleetAuthz.integrations) {
      if (!authz.integrations[key as keyof FleetAuthz['integrations']]) {
        missingAuthz.push(`integrations.${key}`);
      }
    }
  }

  if (missingAuthz.length > 0) {
    return false;
  }

  return true;
}

interface FleetAuthzRouteConfig {
  fleet?: Array<keyof FleetAuthz['fleet']>;
  integrations?: Array<keyof FleetAuthz['integrations']>;
}

type FleetAuthzRouteRegistrar<
  Method extends RouteMethod,
  Context extends RequestHandlerContext = RequestHandlerContext
> = <P, Q, B>(
  route: FleetRouteConfig<P, Q, B, Method>,
  handler: RequestHandler<P, Q, B, Context, Method>
) => void;

type FleetRouteConfig<P, Q, B, Method extends RouteMethod> = RouteConfig<P, Q, B, Method> & {
  fleetAuthz?: FleetAuthzRouteConfig;
  fleetRequireSuperuser?: boolean;
  // TODO temporary required while agents call Fleet setup
  fleetAllowFleetSetupPrivilege?: boolean;
};

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

function shouldHandlePostAuthRequest(req: KibanaRequest) {
  return req.route.path.match(/^\/api\/fleet/);
}

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>
): { router: FleetAuthzRouter<TContext>; onPostAuthHandler: OnPostAuthHandler } {
  const authzMap = new Map<
    string,
    {
      fleetAuthz?: FleetAuthzRouteConfig;
      fleetAllowFleetSetupPrivilege?: boolean;
      fleetRequireSuperuser?: boolean;
    }
  >();

  function routeKey(routeOptions: { path: string; method: string }) {
    return `${routeOptions.method}:${routeOptions.path}`;
  }

  function addRouteAuthz(
    routeOptions: { path: string; method: string },
    authConfig: {
      fleetAuthz?: FleetAuthzRouteConfig;
      fleetAllowFleetSetupPrivilege?: boolean;
      fleetRequireSuperuser?: boolean;
    }
  ) {
    authzMap.set(routeKey(routeOptions), authConfig);
  }

  const fleetAuthzOnPostAuthHandler: OnPostAuthHandler = async (req, res, toolkit) => {
    if (!shouldHandlePostAuthRequest(req)) {
      return toolkit.next();
    }

    if (!checkSecurityEnabled()) {
      return res.forbidden();
    }

    const fleetAuthzConfig = authzMap.get(routeKey(req.route));

    if (!fleetAuthzConfig) {
      return toolkit.next();
    }
    if (fleetAuthzConfig.fleetRequireSuperuser) {
      if (!isSuperuser(req)) {
        return res.forbidden({
          body: {
            message: SUPERUSER_AUTHZ_MESSAGE,
          },
        });
      }
      return toolkit.next();
    }
    const authz = await getAuthzFromRequest(req);
    if (!hasRequiredFleetAuthzPrivilege(authz, fleetAuthzConfig)) {
      return res.forbidden();
    }

    return toolkit.next();
  };

  const fleetAuthzRouter: FleetAuthzRouter<TContext> = {
    get: (
      { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser, ...options },
      handler
    ) => {
      addRouteAuthz(
        { method: 'get', path: options.path },
        { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser }
      );
      return router.get({ ...options }, handler);
    },
    delete: (
      { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser, ...options },
      handler
    ) => {
      addRouteAuthz(
        { method: 'delete', path: options.path },
        { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser }
      );
      return router.delete(options, handler);
    },
    post: (
      { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser, ...options },
      handler
    ) => {
      addRouteAuthz(
        { method: 'post', path: options.path },
        { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser }
      );
      return router.post(options, handler);
    },
    put: (
      { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser, ...options },
      handler
    ) => {
      addRouteAuthz(
        { method: 'put', path: options.path },
        { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser }
      );
      return router.put(options, handler);
    },
    patch: (
      { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser, ...options },
      handler
    ) => {
      addRouteAuthz(
        { method: 'patch', path: options.path },
        { fleetAuthz, fleetAllowFleetSetupPrivilege, fleetRequireSuperuser }
      );

      return router.patch(options, handler);
    },
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };

  return { router: fleetAuthzRouter, onPostAuthHandler: fleetAuthzOnPostAuthHandler };
}
