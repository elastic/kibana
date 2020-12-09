/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandler } from 'src/core/server';
import { appContextService } from '../services';

export function enforceSuperUser<T1, T2, T3>(
  handler: RequestHandler<T1, T2, T3>
): RequestHandler<T1, T2, T3> {
  return function enforceSuperHandler(context, req, res) {
    const security = appContextService.getSecurity();
    const user = security.authc.getCurrentUser(req);
    if (!user) {
      return res.unauthorized();
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes('superuser')) {
      return res.forbidden({
        body: {
          message: 'Access to Fleet API require the superuser role.',
        },
      });
    }
    return handler(context, req, res);
  };
}

export function makeRouterEnforcingSuperuser(router: IRouter): IRouter {
  return {
    get: (options, handler) => router.get(options, enforceSuperUser(handler)),
    delete: (options, handler) => router.delete(options, enforceSuperUser(handler)),
    post: (options, handler) => router.post(options, enforceSuperUser(handler)),
    put: (options, handler) => router.put(options, enforceSuperUser(handler)),
    patch: (options, handler) => router.patch(options, enforceSuperUser(handler)),
    handleLegacyErrors: (handler) => router.handleLegacyErrors(handler),
    getRoutes: () => router.getRoutes(),
    routerPath: router.routerPath,
  };
}
