/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
  decodeRequestParams,
  parseEndpoint,
  routeValidationObject,
} from '@kbn/server-route-repository';
import { CoreSetup, CoreStart, Logger, RouteRegistrar } from 'kibana/server';
import Boom from '@hapi/boom';
import { RequestAbortedError } from '@elastic/elasticsearch/lib/errors';
import { RuleDataClient } from '../../../rule_registry/server';
import { ObservabilityRequestHandlerContext } from '../types';
import { AbstractObservabilityServerRouteRepository } from './types';

export function registerRoutes({
  repository,
  core,
  logger,
  ruleDataClient,
}: {
  core: {
    setup: CoreSetup;
    start: () => Promise<CoreStart>;
  };
  repository: AbstractObservabilityServerRouteRepository;
  logger: Logger;
  ruleDataClient: RuleDataClient;
}) {
  const routes = repository.getRoutes();

  const router = core.setup.http.createRouter();

  routes.forEach((route) => {
    const { endpoint, options, handler, params } = route;
    const { pathname, method } = parseEndpoint(endpoint);

    (router[method] as RouteRegistrar<typeof method, ObservabilityRequestHandlerContext>)(
      {
        path: pathname,
        validate: routeValidationObject,
        options,
      },
      async (context, request, response) => {
        try {
          const decodedParams = decodeRequestParams(
            {
              params: request.params,
              body: request.body,
              query: request.query,
            },
            params ?? t.strict({})
          );

          const data = (await handler({
            context,
            request,
            core,
            logger,
            params: decodedParams,
            ruleDataClient,
          })) as any;

          return response.ok({ body: data });
        } catch (error) {
          logger.error(error);
          const opts = {
            statusCode: 500,
            body: {
              message: error.message,
            },
          };

          if (Boom.isBoom(error)) {
            opts.statusCode = error.output.statusCode;
          }

          if (error instanceof RequestAbortedError) {
            opts.statusCode = 499;
            opts.body.message = 'Client closed request';
          }

          return response.custom(opts);
        }
      }
    );
  });
}
