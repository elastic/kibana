/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  KibanaRequest,
  RequestHandler,
  RequestHandlerContext,
} from 'src/core/server';

import { appContextService } from '../services';

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
  if (!checkSecurityEnabled()) {
    return false;
  }

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

function enforceFleetSetupPrivilege<P, Q, B, TContext extends RequestHandlerContext>(
  handler: RequestHandler<P, Q, B, TContext>
): RequestHandler<P, Q, B, TContext> {
  return async (context, req, res) => {
    const hasFleetSetupPrivilege = await checkFleetSetupPrivilege(req);
    if (!hasFleetSetupPrivilege) {
      return res.forbidden({ body: { message: SUPERUSER_AUTHZ_MESSAGE } });
    }

    return handler(context, req, res);
  };
}

function makeRouterEnforcingFleetSetupPrivilege<TContext extends RequestHandlerContext>(
  router: IRouter<TContext>
): IRouter<TContext> {
  return {
    get: (options, handler) => router.get(options, enforceFleetSetupPrivilege(handler)),
    delete: (options, handler) => router.delete(options, enforceFleetSetupPrivilege(handler)),
    post: (options, handler) => router.post(options, enforceFleetSetupPrivilege(handler)),
    put: (options, handler) => router.put(options, enforceFleetSetupPrivilege(handler)),
    patch: (options, handler) => router.patch(options, enforceFleetSetupPrivilege(handler)),
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };
}

export type RouterWrapper = <T extends RequestHandlerContext>(route: IRouter<T>) => IRouter<T>;

interface RouterWrappersSetup {
  require: {
    superuser: RouterWrapper;
    fleetSetupPrivilege: RouterWrapper;
  };
}

export const RouterWrappers: RouterWrappersSetup = {
  require: {
    superuser: (router) => {
      return makeRouterEnforcingSuperuser(router);
    },
    fleetSetupPrivilege: (router) => {
      return makeRouterEnforcingFleetSetupPrivilege(router);
    },
  },
};
