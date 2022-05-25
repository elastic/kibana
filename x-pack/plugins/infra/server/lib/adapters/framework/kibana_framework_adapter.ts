/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TransportRequestParams } from '@elastic/elasticsearch';
import { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { CoreSetup, IRouter, KibanaRequest, RequestHandler, RouteMethod } from '@kbn/core/server';
import { UI_SETTINGS } from '@kbn/data-plugin/server';
import { TimeseriesVisData } from '@kbn/vis-type-timeseries-plugin/server';
import { TSVBMetricModel } from '../../../../common/inventory_models/types';
import { InfraConfig } from '../../../plugin';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import {
  CallWithRequestParams,
  InfraDatabaseFieldCapsResponse,
  InfraDatabaseGetIndicesAliasResponse,
  InfraDatabaseGetIndicesResponse,
  InfraDatabaseMultiResponse,
  InfraDatabaseSearchResponse,
  InfraRouteConfig,
  InfraServerPluginSetupDeps,
  InfraServerPluginStartDeps,
} from './adapter_types';

interface FrozenIndexParams {
  ignore_throttled?: boolean;
}

export class KibanaFramework {
  public router: IRouter<InfraPluginRequestHandlerContext>;
  public plugins: InfraServerPluginSetupDeps;
  private core: CoreSetup<InfraServerPluginStartDeps>;

  constructor(
    core: CoreSetup<InfraServerPluginStartDeps>,
    config: InfraConfig,
    plugins: InfraServerPluginSetupDeps
  ) {
    this.router = core.http.createRouter();
    this.plugins = plugins;
    this.core = core;
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

  public async callWithRequest(
    requestContext: InfraPluginRequestHandlerContext,
    endpoint: string,
    params: CallWithRequestParams
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
        apiResult = elasticsearch.client.asCurrentUser.search({
          ...params,
          ...frozenIndicesParams,
        });
        break;
      case 'msearch':
        apiResult = elasticsearch.client.asCurrentUser.msearch({
          ...params,
          ...frozenIndicesParams,
        } as estypes.MsearchRequest);
        break;
      case 'fieldCaps':
        // @ts-expect-error FieldCapsRequest.fields is not optional, CallWithRequestParams.fields is
        apiResult = elasticsearch.client.asCurrentUser.fieldCaps({
          ...params,
        });
        break;
      case 'indices.existsAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.existsAlias({
          ...params,
        } as estypes.IndicesExistsAliasRequest);
        break;
      case 'indices.getAlias':
        apiResult = elasticsearch.client.asCurrentUser.indices.getAlias({
          ...params,
        });
        break;
      case 'indices.get':
        apiResult = elasticsearch.client.asCurrentUser.indices.get({
          ...params,
        } as estypes.IndicesGetRequest);
        break;
      case 'transport.request':
        apiResult = elasticsearch.client.asCurrentUser.transport.request({
          ...params,
        } as TransportRequestParams);
        break;
      case 'ml.getBuckets':
        apiResult = elasticsearch.client.asCurrentUser.ml.getBuckets({
          ...params,
        } as estypes.MlGetBucketsRequest);
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
    return startPlugins.data.indexPatterns.indexPatternsServiceFactory(
      savedObjectsClient,
      elasticsearchClient
    );
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
