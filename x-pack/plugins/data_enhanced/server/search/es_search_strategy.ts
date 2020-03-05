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
  ICancel,
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
    const params = { ...defaultParams, ...request.params };

    const response = await (request.isRollup
      ? rollupSearch(caller, { ...request, params }, options)
      : asyncSearch(caller, { ...request, params }, options));

    const rawResponse = request.isRollup
      ? (response as SearchResponse<any>)
      : (response as AsyncSearchResponse<any>).response;

    const id = (response as AsyncSearchResponse<any>).id;
    const { total, failed, skipped, successful } = rawResponse._shards;
    const loaded = failed + skipped + successful;
    return { id, total, loaded, rawResponse };
  };

  const cancel: ICancel<typeof ES_SEARCH_STRATEGY> = async id => {
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
  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const method = request.id ? 'GET' : 'POST';
  const path = request.id ? `_async_search/${request.id}` : `${request.params.index}/_async_search`;

  // Wait up to 1s for the initial response to return
  const { body = undefined, ...params } = request.id
    ? {}
    : { waitForCompletion: '1s', ...request.params };
  const query = toSnakeCase(params ?? {});

  return caller('transport.request', { method, path, body, query }, options);
}

async function rollupSearch(
  caller: APICaller,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const method = 'POST';
  const path = `${request.params.index}/_rollup_search`;
  const { body, ...params } = request.params;
  const query = toSnakeCase(params);
  return caller('transport.request', { method, path, body, query }, options);
}

function toSnakeCase(obj: Record<string, any>) {
  return mapKeys(obj, (value, key) => snakeCase(key));
}
