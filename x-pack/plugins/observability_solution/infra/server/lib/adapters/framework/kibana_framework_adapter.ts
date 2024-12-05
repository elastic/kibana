/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TransportRequestParams } from '@elastic/elasticsearch';
import { ElasticsearchClient, RouteConfig, SavedObjectsClientContract } from '@kbn/core/server';
import { CoreSetup, IRouter, KibanaRequest, RequestHandler, RouteMethod } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import { TimeseriesVisData } from '@kbn/vis-type-timeseries-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { TSVBMetricModel } from '@kbn/metrics-data-access-plugin/common';
import type { InfraConfig, InfraPluginRequestHandlerContext } from '../../../types';
import {
  CallWithRequestParams,
  InfraDatabaseGetIndicesAliasResponse,
  InfraDatabaseGetIndicesResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseSearchResponse,
  InfraRouteConfig,
  InfraServerPluginSetupDeps,
  InfraServerPluginStartDeps,
  InfraVersionedRouteConfig,
} from './adapter_types';
import { subscribeToAborted$ } from '../../cancel_request_on_abort';

interface FrozenIndexParams {
  ignore_throttled?: boolean;
}

export class KibanaFramework {
  public router: IRouter<InfraPluginRequestHandlerContext>;
  public plugins: InfraServerPluginSetupDeps;
  public config: InfraConfig;
  private core: CoreSetup<InfraServerPluginStartDeps>;

  constructor(
    core: CoreSetup<InfraServerPluginStartDeps>,
    config: InfraConfig,
    plugins: InfraServerPluginSetupDeps
  ) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
    this.core = core;
    this.config = config;
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
      /**
       * Supported `options` for each type of request method
       * are a bit different and generic method like this cannot
       * properly ensure type safety. Hence the need to cast
       * using `as ...` below to ensure the route config has
       * the correct options type.
       */
      options: { ...config.options, ...defaultOptions },
    };
    switch (config.method) {
      case 'get':
        this.router.get(routeConfig as RouteConfig<Params, Query, Body, 'get'>, handler);
        break;
      case 'post':
        this.router.post(routeConfig as RouteConfig<Params, Query, Body, 'post'>, handler);
        break;
      case 'delete':
        this.router.delete(routeConfig as RouteConfig<Params, Query, Body, 'delete'>, handler);
        break;
      case 'put':
        this.router.put(routeConfig as RouteConfig<Params, Query, Body, 'put'>, handler);
        break;
      case 'patch':
        this.router.patch(routeConfig as RouteConfig<Params, Query, Body, 'patch'>, handler);
        break;
    }
  }

  public registerVersionedRoute<Method extends RouteMethod = any>(
    config: InfraVersionedRouteConfig<Method>
  ) {
    const defaultOptions = {
      tags: ['access:infra'],
    };
    const routeConfig = {
      access: config.access,
      path: config.path,
      // Currently we have no use of custom options beyond tags, this can be extended
      // beyond defaultOptions if it's needed.
      options: defaultOptions,
    };
    switch (config.method) {
      case 'get':
        return this.router.versioned.get(routeConfig);
      case 'post':
        return this.router.versioned.post(routeConfig);
      case 'delete':
        return this.router.versioned.delete(routeConfig);
      case 'put':
        return this.router.versioned.put(routeConfig);
      case 'patch':
        return this.router.versioned.patch(routeConfig);
      default:
        throw new RangeError(
          `#registerVersionedRoute: "${config.method}" is not an accepted method`
        );
    }
  }

  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'search',
    options?: CallWithRequestParams,
    request?: KibanaRequest
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
  callWithRequest<Hit = {}, Aggregation = undefined>(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'msearch',
    options?: CallWithRequestParams,
    request?: KibanaRequest
  ): Promise<InfraDatabaseMultiResponse<Hit, Aggregation>>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: 'indices.existsAlias',
    options?: CallWithRequestParams,
    request?: KibanaRequest
  ): Promise<boolean>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'indices.getAlias',
    options?: object,
    request?: KibanaRequest
  ): Promise<InfraDatabaseGetIndicesAliasResponse>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'indices.get' | 'ml.getBuckets',
    options?: object,
    request?: KibanaRequest
  ): Promise<InfraDatabaseGetIndicesResponse>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    method: 'transport.request',
    options?: CallWithRequestParams,
    request?: KibanaRequest
  ): Promise<unknown>;
  callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: string,
    options?: CallWithRequestParams,
    request?: KibanaRequest
  ): Promise<InfraDatabaseSearchResponse>;
  public async callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams,
    request?: KibanaRequest
  ) {
    const { elasticsearch, uiSettings } = await requestContext.core;

    const includeFrozen = await uiSettings.client.get<boolean>(UI_SETTINGS.SEARCH_INCLUDE_FROZEN);
    if (endpoint === 'msearch') {
      const maxConcurrentShardRequests = await uiSettings.client.get(
        UI_SETTINGS.COURIER_MAX_CONCURRENT_SHARD_REQUESTS
      );
      if (maxConcurrentShardRequests > 0) {
        params = { ...params, max_concurrent_shard_requests: maxConcurrentShardRequests };
      }
    }

    function callWrapper<T>({
      makeRequestWithSignal,
    }: {
      makeRequestWithSignal: (signal: AbortSignal) => Promise<T>;
    }) {
      const controller = new AbortController();
      const promise = makeRequestWithSignal(controller.signal);
      return request ? subscribeToAborted$(promise, request, controller) : promise;
    }

    // Only set the "ignore_throttled" value (to false) if the Kibana setting
    // for "search:includeFrozen" is true (i.e. don't ignore throttled indices, a triple negative!)
    // More information:
    // - https://github.com/elastic/kibana/issues/113197
    // - https://github.com/elastic/elasticsearch/pull/77479
    //
    // NOTE: these params only need to be spread onto the search and msearch calls below
    const frozenIndicesParams: FrozenIndexParams = {};
    if (includeFrozen) {
      frozenIndicesParams.ignore_throttled = false;
    }

    let apiResult;
    switch (endpoint) {
      case 'search':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.search(
              {
                ...params,
                ...frozenIndicesParams,
              } as estypes.MsearchRequest,
              { signal }
            ),
        });

        break;
      case 'msearch':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.msearch(
              {
                ...params,
                ...frozenIndicesParams,
              } as estypes.MsearchRequest,
              { signal }
            ),
        });

        break;
      case 'indices.existsAlias':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.indices.existsAlias(
              {
                ...params,
              } as estypes.IndicesExistsAliasRequest,
              { signal }
            ),
        });

        break;
      case 'indices.getAlias':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.indices.getAlias(
              {
                ...params,
              },
              { signal }
            ),
        });

        break;
      case 'indices.get':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.indices.get(
              {
                ...params,
              } as estypes.IndicesGetRequest,
              { signal }
            ),
        });

        break;
      case 'transport.request':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.transport.request(
              {
                ...params,
              } as TransportRequestParams,
              { signal }
            ),
        });

        break;
      case 'ml.getBuckets':
        apiResult = callWrapper({
          makeRequestWithSignal: (signal) =>
            elasticsearch.client.asCurrentUser.ml.getBuckets(
              {
                ...params,
              } as estypes.MlGetBucketsRequest,
              { signal }
            ),
        });

        break;
    }
    return apiResult ? await apiResult : undefined;
  }

  public async getIndexPatternsServiceWithRequestContext(
    requestContext: InfraPluginRequestHandlerContext
  ) {
    const { savedObjects, elasticsearch } = await requestContext.core;
    return await this.createIndexPatternsService(
      savedObjects.client,
      elasticsearch.client.asCurrentUser
    );
  }

  public async getIndexPatternsService(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) {
    return await this.createIndexPatternsService(savedObjectsClient, elasticsearchClient);
  }

  private async createIndexPatternsService(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient
  ) {
    const [, startPlugins] = await this.core.getStartServices();
    return startPlugins.data.indexPatterns.dataViewsServiceFactory(
      savedObjectsClient,
      elasticsearchClient
    );
  }

  public getSpaceId(request: KibanaRequest): string {
    return this.plugins.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID;
  }

  public async makeTSVBRequest(
    requestContext: InfraPluginRequestHandlerContext,
    rawRequest: KibanaRequest,
    model: TSVBMetricModel,
    timerange: { min: number; max: number },
    filters: any[]
  ): Promise<TimeseriesVisData> {
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
