/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { Observable } from 'rxjs';
import { SearchResponse } from 'elasticsearch';
import {
  SharedGlobalConfig,
  RequestHandlerContext,
  ElasticsearchClient,
  Logger,
} from '../../../../../src/core/server';
import {
  getDefaultSearchParams,
  getTotalLoaded,
  ISearchStrategy,
  SearchUsage,
  ISearchOptions,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search/es_search';

function isEnhancedEsSearchResponse(response: any): response is IEsSearchResponse {
  return response.hasOwnProperty('isPartial') && response.hasOwnProperty('isRunning');
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const search = async (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ) => {
    logger.debug(`search ${JSON.stringify(request.params) || request.id}`);
    const config = await config$.pipe(first()).toPromise();
    const client = context.core.elasticsearch.client.asCurrentUser;
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, ...request.params };

    const isAsync = request.indexType !== 'rollup';

    try {
      const response = isAsync
        ? await asyncSearch(client, { ...request, params }, options)
        : await rollupSearch(client, { ...request, params }, options);

      if (
        usage &&
        isAsync &&
        isEnhancedEsSearchResponse(response) &&
        !response.isRunning &&
        !response.isPartial
      ) {
        usage.trackSuccess(response.rawResponse.took);
      }

      return response;
    } catch (e) {
      if (usage) usage.trackError();
      throw e;
    }
  };

  const cancel = async (context: RequestHandlerContext, id: string) => {
    logger.debug(`cancel ${id}`);
    await context.core.elasticsearch.client.asCurrentUser.transport.request({
      method: 'DELETE',
      path: encodeURI(`/_async_search/${id}`),
    });
  };

  return { search, cancel };
};

async function asyncSearch(
  client: ElasticsearchClient,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
): Promise<IEsSearchResponse> {
  const { timeout = undefined, restTotalHitsAsInt = undefined, ...params } = {
    ...request.params,
  };

  params.trackTotalHits = true; // Get the exact count of hits

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const { body = undefined, index = undefined, ...queryParams } = request.id ? {} : params;

  const method = request.id ? 'GET' : 'POST';
  const path = encodeURI(request.id ? `/_async_search/${request.id}` : `/${index}/_async_search`);

  // Only report partial results every 64 shards; this should be reduced when we actually display partial results
  const batchedReduceSize = request.id ? undefined : 64;

  const asyncOptions = {
    waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
    keepAlive: '1m', // Extend the TTL for this search request by one minute
  };

  const querystring = toSnakeCase({
    ...asyncOptions,
    ...(batchedReduceSize && { batchedReduceSize }),
    ...queryParams,
  });

  // TODO: replace with async endpoints once https://github.com/elastic/elasticsearch-js/issues/1280 is resolved
  const esResponse = await client.transport.request({
    method,
    path,
    body,
    querystring,
  });

  const { id, response, is_partial: isPartial, is_running: isRunning } = esResponse.body;
  return {
    id,
    isPartial,
    isRunning,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
}

async function rollupSearch(
  client: ElasticsearchClient,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
): Promise<IEsSearchResponse> {
  const { body, index, ...params } = request.params!;
  const method = 'POST';
  const path = encodeURI(`/${index}/_rollup_search`);
  const querystring = toSnakeCase(params);

  const esResponse = await client.transport.request({
    method,
    path,
    body,
    querystring,
  });

  const response = esResponse.body as SearchResponse<any>;
  return {
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
}

function toSnakeCase(obj: Record<string, any>) {
  return mapKeys(obj, (value, key) => snakeCase(key));
}
