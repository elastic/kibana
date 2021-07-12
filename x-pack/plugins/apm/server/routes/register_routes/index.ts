/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { KibanaRequest, RouteRegistrar } from 'src/core/server';
import { RequestAbortedError } from '@elastic/elasticsearch/lib/errors';
import agent from 'elastic-apm-node';
import { ServerRouteRepository } from '@kbn/server-route-repository';
import { merge } from 'lodash';
import {
  decodeRequestParams,
  parseEndpoint,
  routeValidationObject,
} from '@kbn/server-route-repository';
import { mergeRt, jsonRt } from '@kbn/io-ts-utils';
import { UsageCollectionSetup } from '../../../../../../src/plugins/usage_collection/server';
import { pickKeys } from '../../../common/utils/pick_keys';
import { APMRouteHandlerResources, InspectResponse } from '../typings';
import type { ApmPluginRequestHandlerContext } from '../typings';

const inspectRt = t.exact(
  t.partial({
    query: t.exact(t.partial({ _inspect: jsonRt.pipe(t.boolean) })),
  })
);

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

export const inspectableEsQueriesMap = new WeakMap<
  KibanaRequest,
  InspectResponse
>();

export function registerRoutes({
  core,
  repository,
  plugins,
  logger,
  config,
  ruleDataClient,
  telemetryUsageCounter,
}: {
  core: APMRouteHandlerResources['core'];
  plugins: APMRouteHandlerResources['plugins'];
  logger: APMRouteHandlerResources['logger'];
  repository: ServerRouteRepository<APMRouteHandlerResources>;
  config: APMRouteHandlerResources['config'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
  telemetryUsageCounter?: ReturnType<
    UsageCollectionSetup['createUsageCounter']
  >;
}) {
  const routes = repository.getRoutes();

  const router = core.setup.http.createRouter();

  routes.forEach((route) => {
    const { params, endpoint, options, handler } = route;

    const { method, pathname } = parseEndpoint(endpoint);

    (router[method] as RouteRegistrar<
      typeof method,
      ApmPluginRequestHandlerContext
    >)(
      {
        path: pathname,
        options,
        validate: routeValidationObject,
      },
      async (context, request, response) => {
        if (agent.isStarted()) {
          agent.addLabels({
            plugin: 'apm',
          });
        }

        // init debug queries
        inspectableEsQueriesMap.set(request, []);

        try {
          const runtimeType = params ? mergeRt(params, inspectRt) : inspectRt;

          const validatedParams = decodeRequestParams(
            pickKeys(request, 'params', 'body', 'query'),
            runtimeType
          );

          const { aborted, data } = await Promise.race([
            handler({
              request,
              context,
              config,
              logger,
              core,
              plugins,
              params: merge(
                {
                  query: {
                    _inspect: false,
                  },
                },
                validatedParams
              ),
              ruleDataClient,
            }).then((value) => {
              return {
                aborted: false,
                data: value as Record<string, any> | undefined | null,
              };
            }),
            request.events.aborted$.toPromise().then(() => {
              return {
                aborted: true,
                data: undefined,
              };
            }),
          ]);

          if (aborted) {
            return response.custom(CLIENT_CLOSED_REQUEST);
          }

          if (Array.isArray(data)) {
            throw new Error('Return type cannot be an array');
          }

          const body = validatedParams.query?._inspect
            ? {
                ...data,
                _inspect: inspectableEsQueriesMap.get(request),
              }
            : { ...data };

          if (!options.disableTelemetry && telemetryUsageCounter) {
            telemetryUsageCounter.incrementCounter({
              counterName: `${method.toUpperCase()} ${pathname}`,
              counterType: 'success',
            });
          }

          return response.ok({ body });
        } catch (error) {
          logger.error(error);

          if (!options.disableTelemetry && telemetryUsageCounter) {
            telemetryUsageCounter.incrementCounter({
              counterName: `${method.toUpperCase()} ${pathname}`,
              counterType: 'error',
            });
          }
          const opts = {
            statusCode: 500,
            body: {
              message: error.message,
              attributes: {
                _inspect: inspectableEsQueriesMap.get(request),
              },
            },
          };

          if (error instanceof RequestAbortedError) {
            return response.custom(merge(opts, CLIENT_CLOSED_REQUEST));
          }

          if (Boom.isBoom(error)) {
            opts.statusCode = error.output.statusCode;
          }

          return response.custom(opts);
        } finally {
          // cleanup
          inspectableEsQueriesMap.delete(request);
        }
      }
    );
  });
}
