/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import { LegacyAPICaller, SharedGlobalConfig } from '../../../../../src/core/server';
import { ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import {
  ISearch,
  ISearchOptions,
  ISearchCancel,
  getDefaultSearchParams,
  getTotalLoaded,
  ISearchStrategy,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import { shimHitsTotal } from './shim_hits_total';

export interface AsyncSearchResponse<T> {
  id: string;
  is_partial: boolean;
  is_running: boolean;
  response: SearchResponse<T>;
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>
): ISearchStrategy<typeof ES_SEARCH_STRATEGY> => {
  const search: ISearch<typeof ES_SEARCH_STRATEGY> = async (
    context,
    request: IEnhancedEsSearchRequest,
    options
  ) => {
    const config = await config$.pipe(first()).toPromise();
    const caller = context.core.elasticsearch.legacy.client.callAsCurrentUser;
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, ...request.params };

    return request.indexType === 'rollup'
      ? rollupSearch(caller, { ...request, params }, options)
      : asyncSearch(caller, { ...request, params }, options);
  };

  const cancel: ISearchCancel<typeof ES_SEARCH_STRATEGY> = async (context, id) => {
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

  // Wait up to 1s for the response to return
  const query = toSnakeCase({ waitForCompletionTimeout: '100ms', ...queryParams });

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
