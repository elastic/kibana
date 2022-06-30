/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { syntheticsRouteWrapper } from './synthetics_route_wrapper';
import { uptimeRequests } from './legacy_uptime/lib/requests';
import { syntheticsAppRestApiRoutes } from './routes';
import { createRouteWithAuth } from './legacy_uptime/routes';
import { UptimeServerSetup } from './legacy_uptime/lib/adapters';
import { licenseCheck } from './legacy_uptime/lib/domains';

export const initSyntheticsServer = (server: UptimeServerSetup) => {
  const libs = {
    requests: uptimeRequests,
    license: licenseCheck,
  };

  syntheticsAppRestApiRoutes.forEach((route) => {
    const { method, options, handler, validate, path } = syntheticsRouteWrapper(
      createRouteWithAuth(libs, route),
      server
    );

    const routeDefinition = {
      path,
      validate,
      options,
    };

    switch (method) {
      case 'GET':
        server.router.get(routeDefinition, handler);
        break;
      case 'POST':
        server.router.post(routeDefinition, handler);
        break;
      case 'PUT':
        server.router.put(routeDefinition, handler);
        break;
      case 'DELETE':
        server.router.delete(routeDefinition, handler);
        break;
      default:
        throw new Error(`Handler for method ${method} is not defined`);
    }
  });
};
