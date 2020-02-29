/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APICaller } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';
import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { ES_SEARCH_STRATEGY } from '../../../../../../src/plugins/data/common';
import {
  ISearchContext,
  TSearchStrategyProvider,
  ISearch,
  ICancel,
  getDefaultSearchParams,
} from '../../../../../../src/plugins/data/server';

export interface AsyncSearchResponse<T> {
  id: string;
  response: SearchResponse<T>;
}

export const enhancedEsSearchStrategyProvider: TSearchStrategyProvider<typeof ES_SEARCH_STRATEGY> = (
  context: ISearchContext,
  caller: APICaller
) => {
  const search: ISearch<typeof ES_SEARCH_STRATEGY> = async (request, options) => {
    // If we have an ID, then just poll for that ID, otherwise send the entire request body
    const method = request.id ? 'GET' : 'POST';
    const path = request.id
      ? `_async_search/${request.id}`
      : `${request.params.index}/_async_search`;

    const config = await context.config$.pipe(first()).toPromise();
    const defaultParams = getDefaultSearchParams(config);
    const params = request.id
      ? {}
      : { waitForCompletion: '1s', ...defaultParams, ...request.params };
    const { body, ...query } = params;

    const esSearchResponse = (await caller(
      'transport.request',
      { method, path, body, query: mapKeys(query, (value, key) => snakeCase(key)) },
      options
    )) as AsyncSearchResponse<any>;

    const { id, response: rawResponse } = esSearchResponse;
    const { total, failed, skipped, successful } = rawResponse._shards;
    const loaded = failed + skipped + successful;
    return { id, total, loaded, rawResponse };
  };

  const cancel: ICancel<typeof ES_SEARCH_STRATEGY> = id => {
    const method = 'DELETE';
    const path = `_async_search/${id}`;
    return void caller('transport.request', { method, path });
  };

  return { search, cancel };
};
