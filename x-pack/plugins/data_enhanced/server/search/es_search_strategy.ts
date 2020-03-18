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
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';

export interface AsyncSearchResponse<T> {
  id: string;
  response: SearchResponse<T>;
}

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext,
  caller: APICaller
) => {
  const search: ISearch<typeof ES_SEARCH_STRATEGY> = async (
    request: IEnhancedEsSearchRequest,
    options
  ) => {
    const config = await context.config$.pipe(first()).toPromise();
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, trackTotalHits: true, ...request.params };

    const response = await (request.indexType === 'rollup'
      ? rollupSearch(caller, { ...request, params }, options)
      : asyncSearch(caller, { ...request, params }, options));

    const rawResponse =
      request.indexType === 'rollup'
        ? (response as SearchResponse<any>)
        : (response as AsyncSearchResponse<any>).response;

    if (typeof rawResponse.hits.total !== 'number') {
      // @ts-ignore This should be fixed as part of https://github.com/elastic/kibana/issues/26356
      rawResponse.hits.total = rawResponse.hits.total.value;
    }

    const id = (response as AsyncSearchResponse<any>).id;
    const { total, failed, successful } = rawResponse._shards;
    const loaded = failed + successful;
    return { id, total, loaded, rawResponse };
  };

  const cancel: ISearchCancel<typeof ES_SEARCH_STRATEGY> = async id => {
    const method = 'DELETE';
    const path = `_async_search/${id}`;
    await caller('transport.request', { method, path });
  };

  return { search, cancel };
};

function asyncSearch(
  caller: APICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { body = undefined, index = undefined, ...params } = request.id ? {} : request.params;

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const method = request.id ? 'GET' : 'POST';
  const path = request.id ? `_async_search/${request.id}` : `${index}/_async_search`;

  // Wait up to 1s for the response to return
  const query = toSnakeCase({ waitForCompletion: '1s', ...params });

  return caller('transport.request', { method, path, body, query }, options);
}

async function rollupSearch(
  caller: APICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { body, index, ...params } = request.params;
  const method = 'POST';
  const path = `${index}/_rollup_search`;
  const query = toSnakeCase(params);
  return caller('transport.request', { method, path, body, query }, options);
}

function toSnakeCase(obj: Record<string, any>) {
  return mapKeys(obj, (value, key) => snakeCase(key));
}
