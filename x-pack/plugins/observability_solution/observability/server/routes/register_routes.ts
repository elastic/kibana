/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { CoreSetup, KibanaRequest, Logger, RouteRegistrar } from '@kbn/core/server';
import { RuleDataPluginService } from '@kbn/rule-registry-plugin/server';
import {
  decodeRequestParams,
  parseEndpoint,
  routeValidationObject,
} from '@kbn/server-route-repository';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import axios from 'axios';
import * as t from 'io-ts';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { ObservabilityConfig } from '..';
import { getHTTPResponseCode, ObservabilityError } from '../errors';
import { AlertDetailsContextualInsightsService } from '../services';
import { ObservabilityRequestHandlerContext } from '../types';
import { AbstractObservabilityServerRouteRepository } from './types';

interface RegisterRoutes {
  config: ObservabilityConfig;
  core: CoreSetup;
  repository: AbstractObservabilityServerRouteRepository;
  logger: Logger;
  dependencies: RegisterRoutesDependencies;
}

export interface RegisterRoutesDependencies {
  pluginsSetup: {
    core: CoreSetup;
  };
  dataViews: DataViewsServerPluginStart;
  spaces?: SpacesPluginStart;
  ruleDataService: RuleDataPluginService;
  assistant: {
    alertDetailsContextualInsightsService: AlertDetailsContextualInsightsService;
  };
  getRulesClientWithRequest: (request: KibanaRequest) => RulesClientApi;
}

export function registerRoutes({ config, repository, core, logger, dependencies }: RegisterRoutes) {
  const routes = Object.values(repository);

  const router = core.http.createRouter();

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

          const data = await handler({
            config,
            context,
            request,
            logger,
            params: decodedParams,
            dependencies,
          });

          if (data === undefined) {
            return response.noContent();
          }

          return response.ok({ body: data });
        } catch (error) {
          if (error instanceof ObservabilityError) {
            logger.error(error.message);
            return response.customError({
              statusCode: getHTTPResponseCode(error),
              body: {
                message: error.message,
              },
            });
          }

          if (axios.isAxiosError(error)) {
            logger.error(error);
            return response.customError({
              statusCode: error.response?.status || 500,
              body: {
                message: error.message,
              },
            });
          }

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
