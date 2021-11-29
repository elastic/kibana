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

function enforceSuperuser<T1, T2, T3, TContext extends RequestHandlerContext>(
  handler: RequestHandler<T1, T2, T3, TContext>
): RequestHandler<T1, T2, T3, TContext> {
  return function enforceSuperHandler(context, req, res) {
    const isSuperuser = checkSuperuser(req);
    if (!isSuperuser) {
      return res.forbidden({
        body: {
          message: SUPERUSER_AUTHZ_MESSAGE,
        },
      });
    }

    return handler(context, req, res);
  };
}

function makeRouterEnforcingSuperuser<TContext extends RequestHandlerContext>(
  router: IRouter<TContext>
): IRouter<TContext> {
  return {
    get: (options, handler) => router.get(options, enforceSuperuser(handler)),
    delete: (options, handler) => router.delete(options, enforceSuperuser(handler)),
    post: (options, handler) => router.post(options, enforceSuperuser(handler)),
    put: (options, handler) => router.put(options, enforceSuperuser(handler)),
    patch: (options, handler) => router.patch(options, enforceSuperuser(handler)),
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };
}

async function checkFleetSetupPrivilege(req: KibanaRequest) {
  const security = appContextService.getSecurity();

  if (security.authz.mode.useRbacForRequest(req)) {
    const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(req);
    const { hasAllRequested } = await checkPrivileges(
      { kibana: [security.authz.actions.api.get('fleet-setup')] },
      { requireLoginAction: false } // exclude login access requirement
    );

    return !!hasAllRequested;
  }

  return true;
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

function enforceFleetAuthzPrivilege<P, Q, B, TContext extends FleetRequestHandlerContext>(
  handler: RequestHandler<P, Q, B, TContext>,
  authzConfig?: FleetAuthzRouteConfig,
  allowFleetSetupPrivilege?: boolean
): RequestHandler<P, Q, B, TContext> {
  return async (context, req, res) => {
    if (!checkSecurityEnabled()) {
      return res.forbidden();
    }

    if (allowFleetSetupPrivilege) {
      const hasFleetSetupPrivilege = await checkFleetSetupPrivilege(req);
      if (hasFleetSetupPrivilege) {
        return handler(context, req, res);
      }
    }
    if (!context.fleet || !context.fleet.authz) {
      return res.forbidden();
    }
    const { authz } = context.fleet;

    const missingAuthz = [];

    if (authzConfig && typeof authzConfig.fleet !== 'undefined') {
      for (const key of authzConfig.fleet) {
        if (!authz.fleet[key as keyof FleetAuthz['fleet']]) {
          missingAuthz.push(`fleet.${key}`);
        }
      }
    }

    if (authzConfig && typeof authzConfig.integrations !== 'undefined') {
      for (const key of authzConfig.integrations) {
        if (!authz.integrations[key as keyof FleetAuthz['integrations']]) {
          missingAuthz.push(`integrations.${key}`);
        }
      }
    }

    if (missingAuthz.length > 0) {
      return res.forbidden();
    }

    return handler(context, req, res);
  };
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

export function makeRouterWithFleetAuthz<TContext extends FleetRequestHandlerContext>(
  router: IRouter<TContext>
): FleetAuthzRouter<TContext> {
  return {
    get: ({ fleetAuthz, fleetAllowFleetSetupPrivilege, ...options }, handler) =>
      router.get(
        options,
        enforceFleetAuthzPrivilege(handler, fleetAuthz, fleetAllowFleetSetupPrivilege)
      ),
    delete: ({ fleetAuthz, fleetAllowFleetSetupPrivilege, ...options }, handler) =>
      router.delete(
        options,
        enforceFleetAuthzPrivilege(handler, fleetAuthz, fleetAllowFleetSetupPrivilege)
      ),
    post: ({ fleetAuthz, fleetAllowFleetSetupPrivilege, ...options }, handler) =>
      router.post(
        options,
        enforceFleetAuthzPrivilege(handler, fleetAuthz, fleetAllowFleetSetupPrivilege)
      ),
    put: ({ fleetAuthz, fleetAllowFleetSetupPrivilege, ...options }, handler) =>
      router.put(
        options,
        enforceFleetAuthzPrivilege(handler, fleetAuthz, fleetAllowFleetSetupPrivilege)
      ),
    patch: ({ fleetAuthz, fleetAllowFleetSetupPrivilege, ...options }, handler) =>
      router.patch(
        options,
        enforceFleetAuthzPrivilege(handler, fleetAuthz, fleetAllowFleetSetupPrivilege)
      ),
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };
}

export type RouterWrapper = <T extends FleetRequestHandlerContext>(route: IRouter<T>) => IRouter<T>;

interface RouterWrappersSetup {
  require: {
    superuser: RouterWrapper;
    fleetAuthz: <T extends FleetRequestHandlerContext>(route: IRouter<T>) => FleetAuthzRouter<T>;
  };
}

export const RouterWrappers: RouterWrappersSetup = {
  require: {
    superuser: (router) => {
      return makeRouterEnforcingSuperuser(router);
    },
    fleetAuthz: (router) => {
      return makeRouterWithFleetAuthz(router);
    },
  },
};
