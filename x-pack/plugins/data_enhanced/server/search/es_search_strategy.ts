/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { APICaller } from '../../../../../src/core/server';
import { ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import {
  ISearchContext,
  TSearchStrategyProvider,
  ISearch,
  ISearchOptions,
  ISearchCancel,
  getDefaultSearchParams,
  getTotalLoaded,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest, BACKGROUND_SESSION_STORE_DAYS } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { BackgroundSessionService } from '../background_session';
import { SecurityPluginSetup } from '../../../security/server';

export interface AsyncSearchResponse<T> {
  id: string;
  is_partial: boolean;
  is_running: boolean;
  response: SearchResponse<T>;
}

export interface IEnhancedSearchContext extends ISearchContext {
  backgroundSearchService?: BackgroundSessionService;
  security?: SecurityPluginSetup;
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

  const cancel: ISearchCancel<typeof ES_SEARCH_STRATEGY> = async id => {
    const method = 'DELETE';
    const path = encodeURI(`/_async_search/${id}`);
    await caller('transport.request', { method, path });
  };

  return { search, cancel };
};

function trackBackgroundSearch(
  request: IEnhancedEsSearchRequest,
  asyncId: string,
  options?: ISearchOptions,
  context?: IEnhancedSearchContext
) {
  if (
    context &&
    context.backgroundSearchService &&
    context.security &&
    options?.rawRequest &&
    !!request.sessionId &&
    !!asyncId &&
    !request.id
  ) {
    const user = context?.security?.authc.getCurrentUser(options.rawRequest);
    if (user) {
      context.backgroundSearchService.trackId(
        user.email,
        request.sessionId,
        request.params,
        asyncId
      );
    }
  }
}

export function updateExpirationProvider(caller: APICaller) {
  return async (searchId: string) => {
    const path = encodeURI(`/_async_search/${searchId}`);

    // Wait up to 1s for the response to return
    const query = toSnakeCase({
      waitForCompletionTimeout: '1ms',
      keepAlive: `${BACKGROUND_SESSION_STORE_DAYS}d`,
    });

    // const { id, response, is_partial, is_running } =
    await caller('transport.request', {
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

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const { body = undefined, index = undefined, ...queryParams } = request.id ? {} : params;

  const method = request.id ? 'GET' : 'POST';
  const path = encodeURI(request.id ? `/_async_search/${request.id}` : `/${index}/_async_search`);

  // Wait up to 1s for the response to return
  // TODO: DONT MERGE WITH 1ms!!!!!!!!!!!!!!!!!!!!!!!
  const query = toSnakeCase({ waitForCompletionTimeout: '1ms', ...queryParams });

  const { id, response, is_partial, is_running } = (await caller(
    'transport.request',
    { method, path, body, query },
    options
  )) as AsyncSearchResponse<any>;

  trackBackgroundSearch(request, id, options, context);

  return {
    id,
    is_partial,
    is_running,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
}

async function rollupSearch(
  caller: APICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { body, index, ...params } = request.params;
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
