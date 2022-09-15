/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Subject } from 'rxjs';
import { UptimeRequestHandlerContext } from './types';
import { createSyntheticsRouteWithAuth } from './routes/create_route_with_auth';
import { SyntheticsMonitorClient } from './synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { syntheticsRouteWrapper } from './synthetics_route_wrapper';
import { uptimeRequests } from './legacy_uptime/lib/requests';
import { syntheticsAppRestApiRoutes, syntheticsAppStreamingApiRoutes } from './routes';
import { UptimeServerSetup, UptimeCorePluginsSetup } from './legacy_uptime/lib/adapters';
import { licenseCheck } from './legacy_uptime/lib/domains';
import type { SyntheticsRequest } from './legacy_uptime/routes/types';

export const initSyntheticsServer = (
  server: UptimeServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  plugins: UptimeCorePluginsSetup
) => {
  const libs = {
    requests: uptimeRequests,
    license: licenseCheck,
  };

  syntheticsAppRestApiRoutes.forEach((route) => {
    const { method, options, handler, validate, path } = syntheticsRouteWrapper(
      createSyntheticsRouteWithAuth(libs, route),
      server,
      syntheticsMonitorClient
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

  syntheticsAppStreamingApiRoutes.forEach((route) => {
    const { method, streamHandler, path } = syntheticsRouteWrapper(
      createSyntheticsRouteWithAuth(libs, route),
      server,
      syntheticsMonitorClient
    );

    plugins.bfetch.addStreamingResponseRoute<string, unknown>(
      path,
      (request, context) => {
        return {
          getResponseStream: ({ data }: any) => {
            const subject = new Subject<unknown>();

            if (streamHandler) {
              streamHandler(
                context as UptimeRequestHandlerContext,
                request as SyntheticsRequest,
                subject
              );
            }
            return subject;
          },
        };
      },
      method,
      server.router
    );
  });
};
