/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import {
  LegacyAPICaller,
  SharedGlobalConfig,
  RequestHandlerContext,
  Logger,
} from '../../../../../src/core/server';
import {
  ISearchOptions,
  getDefaultSearchParams,
  getTotalLoaded,
  ISearchStrategy,
  SearchUsage,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search/es_search';

interface AsyncSearchResponse<T> {
  id: string;
  is_partial: boolean;
  is_running: boolean;
  response: SearchResponse<T>;
}

interface EnhancedEsSearchResponse extends IEsSearchResponse {
  is_partial: boolean;
  is_running: boolean;
}

function isEnhancedEsSearchResponse(
  response: IEsSearchResponse
): response is EnhancedEsSearchResponse {
  return response.hasOwnProperty('is_partial') && response.hasOwnProperty('is_running');
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
    logger.info(`search ${JSON.stringify(request.params) || request.id}`);
    const config = await config$.pipe(first()).toPromise();
    const caller = context.core.elasticsearch.legacy.client.callAsCurrentUser;
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, ...request.params };

    try {
      const response =
        request.indexType === 'rollup'
          ? await rollupSearch(caller, { ...request, params }, options)
          : await asyncSearch(caller, { ...request, params }, options);

      if (
        usage &&
        (!isEnhancedEsSearchResponse(response) || (!response.is_partial && !response.is_running))
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
    logger.info(`cancel ${id}`);
    const method = 'DELETE';
    const path = encodeURI(`/_async_search/${id}`);
    await context.core.elasticsearch.legacy.client.callAsCurrentUser('transport.request', {
      method,
      path,
    });
  };

  return { search, cancel };
};

async function asyncSearch(
  caller: LegacyAPICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
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

  const query = toSnakeCase({
    waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
    keepAlive: '1m', // Extend the TTL for this search request by one minute
    ...(batchedReduceSize && { batchedReduceSize }),
    ...queryParams,
  });

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, response, is_partial, is_running } = (await caller(
    'transport.request',
    { method, path, body, query },
    options
  )) as AsyncSearchResponse<any>;

  return {
    id,
    is_partial,
    is_running,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
}

async function rollupSearch(
  caller: LegacyAPICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { body, index, ...params } = request.params!;
  const method = 'POST';
  const path = encodeURI(`/${index}/_rollup_search`);
  const query = toSnakeCase(params);

  const rawResponse = await ((caller(
    'transport.request',
    { method, path, body, query },
    options
  ) as unknown) as SearchResponse<any>);

  return { rawResponse, ...getTotalLoaded(rawResponse._shards) };
}

function toSnakeCase(obj: Record<string, any>) {
  return mapKeys(obj, (value, key) => snakeCase(key));
}
