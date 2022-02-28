/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RouteRegistrar } from 'kibana/server';
import { CasesRequestHandlerContext } from '../../types';
import { CaseRoute, RegisterRoutesDeps } from './types';
import { escapeHatch, getIsKibanaRequest, wrapError } from './utils';

const increaseTelemetryCounters = ({
  telemetryUsageCounter,
  method,
  path,
  isKibanaRequest,
  isError = false,
}: {
  telemetryUsageCounter: Exclude<RegisterRoutesDeps['telemetryUsageCounter'], undefined>;
  method: string;
  path: string;
  isKibanaRequest: boolean;
  isError?: boolean;
}) => {
  const counterName = `${method.toUpperCase()} ${path}`;

  telemetryUsageCounter.incrementCounter({
    counterName,
    counterType: isError ? 'error' : 'success',
  });

  telemetryUsageCounter.incrementCounter({
    counterName,
    counterType: `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
  });
};

export const registerRoutes = (deps: RegisterRoutesDeps) => {
  const { router, routes, logger, kibanaVersion, telemetryUsageCounter } = deps;

  routes.forEach((route) => {
    const { method, path, params, handler } = route as CaseRoute;

    (router[method] as RouteRegistrar<typeof method, CasesRequestHandlerContext>)(
      {
        path,
        validate: {
          params: params?.params ?? escapeHatch,
          query: params?.query ?? escapeHatch,
          body: params?.body ?? schema.nullable(escapeHatch),
        },
      },
      async (context, request, response) => {
        const isKibanaRequest = getIsKibanaRequest(request.headers);

        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        try {
          const res = await handler({ logger, context, request, response, kibanaVersion });

          if (telemetryUsageCounter) {
            increaseTelemetryCounters({ telemetryUsageCounter, method, path, isKibanaRequest });
          }

          return res;
        } catch (error) {
          logger.error(error.message);

          if (telemetryUsageCounter) {
            increaseTelemetryCounters({
              telemetryUsageCounter,
              method,
              path,
              isError: true,
              isKibanaRequest,
            });
          }

          return response.customError(wrapError(error));
        }
      }
    );
  });
};
