/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLSchema } from 'graphql';
import { runHttpQuery } from 'apollo-server-core';
import { schema, TypeOf } from '@kbn/config-schema';
import {
  InfraRouteConfig,
  InfraTSVBResponse,
  InfraServerPluginSetupDeps,
  CallWithRequestParams,
  InfraDatabaseSearchResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseFieldCapsResponse,
  InfraDatabaseGetIndicesResponse,
  InfraDatabaseGetIndicesAliasResponse,
} from './adapter_types';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import {
  CoreSetup,
  IRouter,
  KibanaRequest,
  KibanaResponseFactory,
  RouteMethod,
} from '../../../../../../../src/core/server';
import { RequestHandler } from '../../../../../../../src/core/server';
import { InfraConfig } from '../../../plugin';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { IndexPatternsFetcher, UI_SETTINGS } from '../../../../../../../src/plugins/data/server';

export class KibanaFramework {
  public router: IRouter<InfraPluginRequestHandlerContext>;
  public plugins: InfraServerPluginSetupDeps;

  constructor(core: CoreSetup, config: InfraConfig, plugins: InfraServerPluginSetupDeps) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
  }

  public registerRoute<Params = any, Query = any, Body = any, Method extends RouteMethod = any>(
    config: InfraRouteConfig<Params, Query, Body, Method>,
    handler: RequestHandler<Params, Query, Body, InfraPluginRequestHandlerContext>
  ) {
    const defaultOptions = {
      tags: ['access:infra'],
    };
    const routeConfig = {
      path: config.path,
      validate: config.validate,
      // Currently we have no use of custom options beyond tags, this can be extended
      // beyond defaultOptions if it's needed.
      options: defaultOptions,
    };
    switch (config.method) {
      case 'get':
        this.router.get(routeConfig, handler);
        break;
      case 'post':
        this.router.post(routeConfig, handler);
        break;
      case 'delete':
        this.router.delete(routeConfig, handler);
        break;
      case 'put':
        this.router.put(routeConfig, handler);
        break;
      case 'patch':
        this.router.patch(routeConfig, handler);
        break;
    }
  }

  public registerGraphQLEndpoint(routePath: string, gqlSchema: GraphQLSchema) {
    // These endpoints are validated by GraphQL at runtime and with GraphQL generated types
    const body = schema.object({}, { unknowns: 'allow' });
    type Body = TypeOf<typeof body>;

    const routeOptions = {
      path: `/api/infra${routePath}`,
      validate: {
        body,
      },
      options: {
        tags: ['access:infra'],
      },
    };
    async function handler(
      context: InfraPluginRequestHandlerContext,
      request: KibanaRequest<unknown, unknown, Body>,
      response: KibanaResponseFactory
    ) {
      try {
        const query =
          request.route.method === 'post'
            ? (request.body as Record<string, any>)
            : (request.query as Record<string, any>);

        const gqlResponse = await runHttpQuery([context, request], {
          method: request.route.method.toUpperCase(),
          options: (req: InfraPluginRequestHandlerContext, rawReq: KibanaRequest) => ({
            context: { req, rawReq },
            schema: gqlSchema,
          }),
          query,
        });

        return response.ok({
          body: gqlResponse,
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        const errorBody = {
          message: error.message,
        };

        if ('HttpQueryError' !== error.name) {
          return response.internalError({
            body: errorBody,
          });
        }

        if (error.isGraphQLError === true) {
          return response.customError({
            statusCode: error.statusCode,
            body: errorBody,
            headers: {
              'Content-Type': 'application/json',
            },
          });
        }

        const { headers = [], statusCode = 500 } = error;
        return response.customError({
          statusCode,
          headers,
          body: errorBody,
        });
      }
    }
    this.router.post(routeOptions, handler);
    this.router.get(routeOptions, handler);
  }

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'search',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'msearch',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'fieldCaps',
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseFieldCapsResponse>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: CallWithRequestParams
  ): Promise<boolean>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'indices.getAlias',
    options?: object
  ): Promise<InfraDatabaseGetIndicesAliasResponse>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'indices.get' | 'ml.getBuckets',
    options?: object
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'transport.request',
    options?: CallWithRequestParams
  ): Promise<unknown>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: string,
    options?: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse>;

  public async callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams
  ) {
    const { elasticsearch, uiSettings } = requestContext.core;

    const includeFrozen = await uiSettings.client.get(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await uiSettings.client.get(
        UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
      );
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    const frozenIndicesParams = ['search', 'msearch'].includes(endpoint)
      ? {
          ignore_throttled: !includeFrozen,
        }
      : {};

    return elasticsearch.legacy.client.callAsCurrentUser(endpoint, {
      ...params,
      ...frozenIndicesParams,
    });
  }

  public getIndexPatternsService(
    requestContext: InfraPluginRequestHandlerContext
  ): IndexPatternsFetcher {
    return new IndexPatternsFetcher(requestContext.core.elasticsearch.client.asCurrentUser, true);
  }

  public getSpaceId(request: KibanaRequest): string {
    const spacesPlugin = this.plugins.spaces;

    if (
      spacesPlugin &&
      spacesPlugin.spacesService &&
      typeof spacesPlugin.spacesService.getSpaceId === 'function'
    ) {
      return spacesPlugin.spacesService.getSpaceId(request);
    } else {
      return 'default';
    }
  }

  public async makeTSVBRequest(
    requestContext: InfraPluginRequestHandlerContext,
    rawRequest: KibanaRequest,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ): Promise<InfraTSVBResponse> {
    const { getVisData } = this.plugins.visTypeTimeseries;
    if (typeof getVisData !== 'function') {
      throw new Error('TSVB is not available');
    }
    const options = {
      timerange,
      panels: [model],
      filters,
    };
    return getVisData(requestContext, rawRequest, options);
  }
}
