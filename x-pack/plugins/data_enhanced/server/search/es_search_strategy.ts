/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import type { SearchResponse } from 'elasticsearch';
import type { ApiResponse } from '@elastic/elasticsearch';

import {
  getShardTimeout,
  shimHitsTotal,
  search,
  SearchStrategyDependencies,
} from '../../../../../src/plugins/data/server';
import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';
import { getDefaultSearchParams, getAsyncOptions } from './get_default_search_params';

import type { SharedGlobalConfig, Logger } from '../../../../../src/core/server';

import type {
  ISearchStrategy,
  SearchUsage,
  IEsRawSearchResponse,
  ISearchOptions,
  IEsSearchResponse,
} from '../../../../../src/plugins/data/server';

import type { IEnhancedEsSearchRequest } from '../../common';

const { utils } = search.esSearch;

interface IEsRawAsyncSearchResponse<Source = any> extends IEsRawSearchResponse<Source> {
  response: SearchResponse<Source>;
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IEnhancedEsSearchRequest> => {
  function asyncSearch(
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const asyncOptions = getAsyncOptions();
    const client = esClient.asCurrentUser.asyncSearch;

    return doPartialSearch<ApiResponse<IEsRawAsyncSearchResponse>>(
      async () =>
        client.submit(
          utils.toSnakeCase({
            ...(await getDefaultSearchParams(uiSettingsClient)),
            batchedReduceSize: 64,
            ...asyncOptions,
            ...request.params,
          })
        ),
      (id) =>
        client.get({
          id: id!,
          ...utils.toSnakeCase({ ...asyncOptions }),
        }),
      (response) => !response.body.is_running,
      (response) => response.body.id,
      request.id,
      options
    ).pipe(
      utils.toKibanaSearchResponse(),
      map((response) => ({
        ...response,
        rawResponse: shimHitsTotal(response.rawResponse.response!),
      })),
      utils.trackSearchStatus(logger, usage),
      utils.includeTotalLoaded()
    );
  }

  async function rollupSearch(
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = utils.toSnakeCase({
      ...getShardTimeout(config),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    });

    const promise = esClient.asCurrentUser.transport.request({
      method,
      path,
      body,
      querystring,
    });

    const esResponse = await utils.shimAbortSignal(promise, options?.abortSignal);

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...utils.getTotalLoaded(response._shards),
    };
  }

  return {
    search: (request, options, deps) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

      return request.indexType !== 'rollup'
        ? asyncSearch(request, options, deps)
        : from(rollupSearch(request, options, deps));
    },
    cancel: async (id, options, { esClient }) => {
      logger.debug(`cancel ${id}`);
      await esClient.asCurrentUser.asyncSearch.delete({ id });
    },
  };
};
