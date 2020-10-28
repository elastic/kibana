/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
import { first, map } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';

import { ApiResponse } from '@elastic/elasticsearch';
import { getShardTimeout, shimHitsTotal, search } from '../../../../../src/plugins/data/server';
import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';
import { getDefaultSearchParams, getAsyncOptions } from './get_default_search_params';

import type { ISearchStrategy, SearchUsage } from '../../../../../src/plugins/data/server';
import type { IEnhancedEsSearchRequest } from '../../common';
import {
  IEsRawSearchResponse,
  shimAbortSignal,
  toSnakeCase,
} from '../../../../../src/plugins/data/common/search';
import type {
  ISearchOptions,
  IEsSearchResponse,
} from '../../../../../src/plugins/data/common/search';
import type {
  SharedGlobalConfig,
  RequestHandlerContext,
  Logger,
} from '../../../../../src/core/server';

const { esSearch } = search;

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  function asyncSearch(
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    context: RequestHandlerContext
  ) {
    const asyncOptions = getAsyncOptions();
    const client = context.core.elasticsearch.client.asCurrentUser.asyncSearch;

    return doPartialSearch<ApiResponse<IEsRawSearchResponse>>(
      async () =>
        client.submit(
          toSnakeCase({
            ...(await getDefaultSearchParams(context.core.uiSettings.client)),
            batchedReduceSize: 64,
            ...asyncOptions,
            ...request.params,
          })
        ),
      (id) =>
        client.get({
          id: id!,
          ...toSnakeCase({ ...asyncOptions }),
        }),
      (response) => !(response.body.is_partial && response.body.is_running),
      (response) => response.body.id,
      request.id,
      options
    ).pipe(
      esSearch.toKibanaSearchResponse(),
      map((response) => ({
        ...response,
        rawResponse: shimHitsTotal(response.rawResponse.response!),
      })),
      esSearch.trackSearchStatus(logger, usage),
      esSearch.includeTotalLoaded()
    );
  }

  const rollupSearch = async function (
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    context: RequestHandlerContext
  ): Promise<IEsSearchResponse> {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = await context.core.uiSettings.client;
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = esSearch.toSnakeCase({
      ...getShardTimeout(config),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    });

    const promise = esClient.transport.request({
      method,
      path,
      body,
      querystring,
    });

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...esSearch.getTotalLoaded(response._shards),
    };
  };

  return {
    search: (
      request: IEnhancedEsSearchRequest,
      options: ISearchOptions,
      context: RequestHandlerContext
    ) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

      return request.indexType !== 'rollup'
        ? asyncSearch(request, options, context)
        : from(rollupSearch(request, options, context));
    },
    cancel: async (context: RequestHandlerContext, id: string) => {
      logger.debug(`cancel ${id}`);

      await context.core.elasticsearch.client.asCurrentUser.asyncSearch.delete({
        id,
      });
    },
  };
};
