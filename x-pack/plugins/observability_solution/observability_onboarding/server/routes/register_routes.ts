/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { CoreSetup, Logger, RouteRegistrar } from '@kbn/core/server';
import {
  ServerRouteRepository,
  decodeRequestParams,
  parseEndpoint,
  routeValidationObject,
} from '@kbn/server-route-repository';
import * as t from 'io-ts';
import { ObservabilityOnboardingConfig } from '..';
import { EsLegacyConfigService } from '../services/es_legacy_config_service';
import { ObservabilityOnboardingRequestHandlerContext } from '../types';
import { ObservabilityOnboardingRouteHandlerResources } from './types';

interface RegisterRoutes {
  core: CoreSetup;
  repository: ServerRouteRepository;
  logger: Logger;
  plugins: ObservabilityOnboardingRouteHandlerResources['plugins'];
  config: ObservabilityOnboardingConfig;
  kibanaVersion: string;
  services: {
    esLegacyConfigService: EsLegacyConfigService;
  };
}

export function registerRoutes({
  repository,
  core,
  logger,
  plugins,
  config,
  kibanaVersion,
  services,
}: RegisterRoutes) {
  const routes = Object.values(repository);

  const router = core.http.createRouter();

  routes.forEach((route) => {
    const { endpoint, options, handler, params } = route;
    const { pathname, method } = parseEndpoint(endpoint);

    (
      router[method] as RouteRegistrar<
        typeof method,
        ObservabilityOnboardingRequestHandlerContext
      >
    )(
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
            logger,
            params: decodedParams,
            plugins,
            core: {
              setup: core,
              start: async () => {
                const [coreStart] = await core.getStartServices();
                return coreStart;
              },
            },
            config,
            kibanaVersion,
            services,
          })) as any;

          if (data === undefined) {
            return response.noContent();
          }

          return response.ok({ body: data });
        } catch (error) {
          if (Boom.isBoom(error)) {
            logger.error(error.output.payload.message);
            return response.customError({
              statusCode: error.output.statusCode,
              body: { message: error.output.payload.message },
            });
          }

          logger.error(error);
          const opts = {
            statusCode: 500,
            body: {
              message: error.message,
            },
          };

          if (error instanceof errors.RequestAbortedError) {
            opts.statusCode = 499;
            opts.body.message = 'Client closed request';
          }

          return response.customError(opts);
        }
      }
    );
  });
}
