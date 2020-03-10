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
  getDefaultSearchParams,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';

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

    const rawResponse = (await (request.indexType === 'rollup'
      ? rollupSearch(caller, { ...request, params }, options)
      : caller('search', params, options))) as SearchResponse<any>;

    const { total, failed, successful } = rawResponse._shards;
    const loaded = failed + successful;
    return { total, loaded, rawResponse };
  };

  return { search };
};

function rollupSearch(
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
