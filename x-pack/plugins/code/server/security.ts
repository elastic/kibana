/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server, ServerRoute, RouteOptions } from 'hapi';

export interface SecuredRoute extends ServerRoute {
  requireAdmin?: boolean;
}

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
      const routeOptions: RouteOptions = (route.options || {}) as RouteOptions;
      routeOptions.tags = [
        ...(routeOptions.tags || []),
        `access:code_${route.requireAdmin ? 'admin' : 'user'}`,
      ];

      self.server.route({
        handler: route.handler,
        method: route.method,
        options: routeOptions,
        path: route.path,
      });
    }

    // FIXME: don't attach to the server this way. Use server.decorate or similar.
    this.server.securedRoute = securedRoute;
  }
}

export function enableSecurity(server: Server) {
  const secureRoute = new SecureRoute(server);
  secureRoute.install();
}
