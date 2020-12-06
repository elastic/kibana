/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Observable } from 'rxjs';
import type { Logger, SharedGlobalConfig } from 'kibana/server';
import { first, tap } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
<<<<<<< HEAD
import { APICaller } from 'kibana/server';
import { ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import {
  ISearchContext,
  TSearchStrategyProvider,
  ISearch,
=======
import { from } from 'rxjs';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
  ISearchOptions,
  ISearchStrategy,
  SearchStrategyDependencies,
  SearchUsage,
} from '../../../../../src/plugins/data/server';
import {
  getDefaultSearchParams,
  getShardTimeout,
  getTotalLoaded,
  searchUsageObserver,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
<<<<<<< HEAD
import { IEnhancedEsSearchRequest, BACKGROUND_SESSION_STORE_DAYS } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { BackgroundSessionService } from '../background_session';

export interface AsyncSearchResponse<T> {
  id: string;
  is_partial: boolean;
  is_running: boolean;
  response: SearchResponse<T>;
}

export interface IEnhancedSearchContext extends ISearchContext {
  backgroundSearchService?: BackgroundSessionService;
}

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: IEnhancedSearchContext,
  caller: APICaller
) => {
  const search: ISearch<typeof ES_SEARCH_STRATEGY> = async (
    request: IEnhancedEsSearchRequest,
    options
  ) => {
    const config = await context.config$.pipe(first()).toPromise();
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, ...request.params };

    return request.indexType === 'rollup'
      ? rollupSearch(caller, { ...request, params }, options)
      : asyncSearch(caller, { ...request, params }, options, context);
  };

  const cancel: ISearchCancel<typeof ES_SEARCH_STRATEGY> = async (id) => {
    const method = 'DELETE';
    const path = encodeURI(`/_async_search/${id}`);
    await caller('transport.request', { method, path });
  };

  return { search, cancel };
};

async function getBackgroundSession(
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  if (
    context?.backgroundSearchService &&
    options?.rawRequest &&
    !!request.sessionId &&
    !request.id
  ) {
    return await context.backgroundSearchService.getId(
      options?.rawRequest,
      request.sessionId,
      request.params.body
    );
  }
}

function trackBackgroundSearch(
  request: IEnhancedEsSearchRequest,
  asyncId: string,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  if (
    context &&
    context.backgroundSearchService &&
    options?.rawRequest &&
    !!request.sessionId &&
    !!asyncId &&
    !request.id
  ) {
    context.backgroundSearchService.trackId(
      options.rawRequest,
      request.sessionId,
      request.params.body,
      asyncId
    );
  }
}

export function updateExpirationProvider(caller: APICaller) {
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
  caller: APICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  const { timeout = undefined, restTotalHitsAsInt = undefined, ...params } = {
    trackTotalHits: true, // Get the exact count of hits
    ...request.params,
  };

  const storedAsyncId = await getBackgroundSession(request, options, context);
  const asyncId = request.id ? request.id : storedAsyncId;

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const { body = undefined, index = undefined, ...queryParams } = asyncId ? {} : params;
  const method = asyncId ? 'GET' : 'POST';
  const path = encodeURI(asyncId ? `/_async_search/${asyncId}` : `/${index}/_async_search`);

  // Wait up to 1ms for the response to return for new requests
  // DONT MERGE WITH requestCache: false,
  const query = toSnakeCase({
    ...(asyncId
      ? {}
      : {
          requestCache: false,
          waitForCompletionTimeout: '1ms',
        }),
    ...queryParams,
  });

  const { id, response, is_partial, is_running } = (await caller(
    'transport.request',
    { method, path, body, query },
    options
  )) as AsyncSearchResponse<any>;
=======
import type { IAsyncSearchOptions } from '../../common';
import { pollSearch } from '../../common';
import {
  getDefaultAsyncGetParams,
  getDefaultAsyncSubmitParams,
  getIgnoreThrottled,
} from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';
import { AsyncSearchResponse } from './types';

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IEsSearchRequest> => {
  function asyncSearch(
    { id, ...request }: IEsSearchRequest,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const client = esClient.asCurrentUser.asyncSearch;

    const search = async () => {
      const params = id
        ? getDefaultAsyncGetParams()
        : { ...(await getDefaultAsyncSubmitParams(uiSettingsClient, options)), ...request.params };
      const promise = id
        ? client.get<AsyncSearchResponse>({ ...params, id })
        : client.submit<AsyncSearchResponse>(params);
      const { body } = await shimAbortSignal(promise, options.abortSignal);
      return toAsyncKibanaSearchResponse(body);
    };

    return pollSearch(search, options).pipe(
      tap((response) => (id = response.id)),
      tap(searchUsageObserver(logger, usage))
    );
  }

  async function rollupSearch(
    request: IEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = {
      ...getShardTimeout(config),
      ...(await getIgnoreThrottled(uiSettingsClient)),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    };

    const promise = esClient.asCurrentUser.transport.request({
      method,
      path,
      body,
      querystring,
    });

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);
    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...getTotalLoaded(response),
    };
  }
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146

  // Track if ID wasn't recovered from a BG search
  if (!storedAsyncId) {
    trackBackgroundSearch(request, id, options, context);
  }

  return {
<<<<<<< HEAD
    id,
    is_partial,
    is_running,
    restored: !!storedAsyncId,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
=======
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

      return request.indexType !== 'rollup'
        ? asyncSearch(request, options, deps)
        : from(rollupSearch(request, options, deps));
    },
    cancel: async (id, options, { esClient }) => {
      logger.debug(`cancel ${id}`);
      await esClient.asCurrentUser.asyncSearch.delete({ id });
    },
>>>>>>> 058f28ab235a661cfa4b9168e97dd55026f54146
  };
};
