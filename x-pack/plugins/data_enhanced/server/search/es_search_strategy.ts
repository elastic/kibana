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
import { IEnhancedEsSearchRequest, BACKGROUND_SESSION_STORE_DAYS } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search/es_search';

type IEnhancedSearchContext = any;
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
          : await asyncSearch(caller, { ...request, params }, options, context);

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

function checkRequest(
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
): boolean {
  return !!(
    context &&
    context.backgroundSearchService &&
    options?.rawRequest &&
    !!request.sessionId &&
    !request.id
  );
}

async function getBackgroundSession(
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  if (checkRequest(request, options, context)) {
    return await context.backgroundSearchService.getId(
      options!.rawRequest,
      request.sessionId,
      request.params?.body
    );
  }
}

function trackBackgroundSearch(
  request: IEnhancedEsSearchRequest,
  asyncId: string,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  if (checkRequest(request, options, context)) {
    context.backgroundSearchService.trackId(
      options!.rawRequest,
      request.sessionId,
      request.params?.body,
      asyncId
    );
  }
}

export function updateExpirationProvider(caller: LegacyAPICaller) {
  return async (searchId: string) => {
    const path = encodeURI(`/_async_search/${searchId}`);

    // Wait up to 1ms for the response to return
    const query = toSnakeCase({
      waitForCompletionTimeout: '1ms',
      keepAlive: `${BACKGROUND_SESSION_STORE_DAYS}d`,
    });

    return caller('transport.request', {
      method: 'GET',
      path,
      query,
    });
  };
}

async function asyncSearch(
  caller: LegacyAPICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  const { timeout = undefined, restTotalHitsAsInt = undefined, ...params } = {
    ...request.params,
  };

  // Distinguisj between an ID we retrieved from a session to an
  const storedAsyncId = await getBackgroundSession(request, options, context);
  const asyncId = request.id ? request.id : storedAsyncId;

  params.trackTotalHits = true; // Get the exact count of hits

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const { body = undefined, index = undefined, ...queryParams } = asyncId ? {} : params;
  const method = asyncId ? 'GET' : 'POST';
  const path = encodeURI(asyncId ? `/_async_search/${asyncId}` : `/${index}/_async_search`);

  // Only report partial results every 64 shards; this should be reduced when we actually display partial results
  const batchedReduceSize = request.id ? undefined : 64;

  // Wait up to 1ms for the response to return for new requests
  // DONT MERGE WITH requestCache: false,
  const query = toSnakeCase({
    ...(asyncId
      ? {}
      : {
          requestCache: false,
          waitForCompletionTimeout: '100ms',
        }),
    keepAlive: '1m', // Extend the TTL for this search request by one minute
    ...(batchedReduceSize && { batchedReduceSize }),
    ...queryParams,
  });

  const { id, response, is_partial, is_running } = (await caller(
    'transport.request',
    { method, path, body, query },
    options
  )) as AsyncSearchResponse<any>;

  // Track if ID wasn't recovered from a BG search
  if (!storedAsyncId) {
    trackBackgroundSearch(request, id, options, context);
  }

  return {
    id,
    is_partial,
    is_running,
    restored: !!storedAsyncId,
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
