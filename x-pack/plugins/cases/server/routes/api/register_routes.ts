/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { Headers, RouteRegistrar } from 'kibana/server';
import { CasesRequestHandlerContext } from '../../types';
import { RegisterRoutesDeps } from './types';
import {
  escapeHatch,
  getIsKibanaRequest,
  getWarningHeader,
  logDeprecatedEndpoint,
  wrapError,
} from './utils';

const getEndpoint = (method: string, path: string): string => `${method.toUpperCase()} ${path}`;

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
  const counterName = getEndpoint(method, path);

  telemetryUsageCounter.incrementCounter({
    counterName,
    counterType: isError ? 'error' : 'success',
  });

  telemetryUsageCounter.incrementCounter({
    counterName,
    counterType: `kibanaRequest.${isKibanaRequest ? 'yes' : 'no'}`,
  });
};

const logAndIncreaseDeprecationTelemetryCounters = ({
  logger,
  headers,
  method,
  path,
  telemetryUsageCounter,
}: {
  logger: RegisterRoutesDeps['logger'];
  headers: Headers;
  method: string;
  path: string;
  telemetryUsageCounter?: Exclude<RegisterRoutesDeps['telemetryUsageCounter'], undefined>;
}) => {
  const endpoint = getEndpoint(method, path);

  logDeprecatedEndpoint(logger, headers, `The endpoint ${endpoint} is deprecated.`);

  if (telemetryUsageCounter) {
    telemetryUsageCounter.incrementCounter({
      counterName: endpoint,
      counterType: 'deprecated',
    });
  }
};

export const registerRoutes = (deps: RegisterRoutesDeps) => {
  const { router, routes, logger, kibanaVersion, telemetryUsageCounter } = deps;

  routes.forEach((route) => {
    const { method, path, params, options, handler } = route;

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
        let responseHeaders = {};
        const isKibanaRequest = getIsKibanaRequest(request.headers);

        if (!context.cases) {
          return response.badRequest({ body: 'RouteHandlerContext is not registered for cases' });
        }

        try {
          if (options?.deprecated) {
            logAndIncreaseDeprecationTelemetryCounters({
              telemetryUsageCounter,
              logger,
              path,
              method,
              headers: request.headers,
            });

            responseHeaders = {
              ...responseHeaders,
              ...getWarningHeader(kibanaVersion),
            };
          }

          const res = await handler({ logger, context, request, response, kibanaVersion });

          if (telemetryUsageCounter) {
            increaseTelemetryCounters({ telemetryUsageCounter, method, path, isKibanaRequest });
          }

          res.options.headers = {
            ...res.options.headers,
            ...responseHeaders,
          };

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
