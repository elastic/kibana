/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Lifecycle, Request, ResponseToolkit, Server, ServerRoute } from 'hapi';

export interface SecuredRoute extends ServerRoute {
  requireRoles?: string[];
  requireAdmin?: boolean;
}

export const ADMIN_ROLE = 'code_admin';

declare module 'hapi' {
  interface Server {
    securedRoute(route: SecuredRoute): void;
  }
}

export class SecureRoute {
  constructor(readonly server: Server) {}

  public install() {
    const self = this;
    function securedRoute(route: SecuredRoute) {
      if (route.handler) {
        const originHandler = route.handler as Lifecycle.Method;
        route.handler = async (req: Request, h: ResponseToolkit, err?: Error) => {
          if (self.isSecurityEnabledInEs()) {
            let requiredRoles = route.requireRoles || [];
            if (route.requireAdmin) {
              requiredRoles = requiredRoles.concat([ADMIN_ROLE]);
            }
            if (requiredRoles.length > 0) {
              if (!req.auth.isAuthenticated) {
                throw Boom.unauthorized('not login.');
              } else {
                // @ts-ignore
                const userRoles = new Set(req.auth.credentials.roles || []);
                const authorized =
                  userRoles.has('superuser') ||
                  requiredRoles.every((value: string) => userRoles.has(value));
                if (!authorized) {
                  throw Boom.forbidden('not authorized user.');
                }
              }
            }
          }
          return await originHandler(req, h, err);
        };
      }
      self.server.route({
        handler: route.handler,
        method: route.method,
        options: route.options,
        path: route.path,
      });
    }

    this.server.securedRoute = securedRoute;
  }

  private isSecurityEnabledInEs() {
    const xpackInfo = this.server.plugins.xpack_main.info;
    if (
      xpackInfo.isAvailable() &&
      (!xpackInfo.feature('security').isEnabled() || xpackInfo.license.isOneOf('basic'))
    ) {
      return false;
    }
    return true;
  }
}

export function enableSecurity(server: Server) {
  const secureRoute = new SecureRoute(server);
  secureRoute.install();
}
