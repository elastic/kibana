/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first, map, tap, expand, mergeMap } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { Observable, from, timer, EMPTY } from 'rxjs';
import { ApiResponse } from '@elastic/elasticsearch';
import { SharedGlobalConfig, RequestHandlerContext, Logger } from '../../../../../src/core/server';
import {
  ISearchStrategy,
  SearchUsage,
  getDefaultSearchParams,
  getShardTimeout,
  toSnakeCase,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest, IAsyncSearchOptions } from '../../common';
import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search';

interface AsyncSearchResponse {
  is_partial: boolean;
  is_running: boolean;
  id?: string;
  response: SearchResponse<any>;
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const search = (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options: IAsyncSearchOptions = {}
  ) => {
    logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

    const isAsync = request.indexType !== 'rollup';

    try {
      return isAsync
        ? asyncSearch(context, request, options)
        : from(rollupSearch(context, request));
    } catch (e) {
      if (usage) usage.trackError();
      throw e;
    }
  };

  const cancel = async (context: RequestHandlerContext, id: string) => {
    logger.debug(`cancel ${id}`);
    await context.core.elasticsearch.client.asCurrentUser.asyncSearch.delete({
      id,
    });
  };

  async function runAsyncSearch(
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: IAsyncSearchOptions
  ): Promise<ApiResponse<AsyncSearchResponse>> {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const defaultParams = await getDefaultSearchParams(context.core.uiSettings.client);
    const asyncOptions = {
      waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
      keepAlive: '1m', // Extend the TTL for this search request by one minute
    };

    // If we have an ID, then just poll for that ID, otherwise send the entire request body
    if (!request.id) {
      const submitOptions = toSnakeCase({
        requestCache: false,
        batchedReduceSize: 64, // Only report partial results every 64 shards; this should be reduced when we actually display partial results
        ...defaultParams,
        ...asyncOptions,
        ...request.params,
      });

      logger.debug('Submitting async search');
      return esClient.asyncSearch.submit<AsyncSearchResponse>(submitOptions);
    } else {
      logger.debug(`Fetching async search ${request.id}`);
      return esClient.asyncSearch.get<AsyncSearchResponse>({
        id: request.id,
        ...toSnakeCase(asyncOptions),
      });
    }
  }

  function asyncSearch(
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options: IAsyncSearchOptions
  ): Observable<IEsSearchResponse> {
    return from(runAsyncSearch(context, request)).pipe(
      expand((response: ApiResponse<AsyncSearchResponse>) => {
        const { body } = response;
        const { pollInterval = 1000 } = options;
        if (options?.waitForCompletion && body.is_running && body.is_partial && body.id) {
          return timer(pollInterval).pipe(
            mergeMap(() => {
              return from(runAsyncSearch(context, { ...request, id: body.id }));
            })
          );
        } else {
          return EMPTY;
        }
      }),
      map((response: ApiResponse<AsyncSearchResponse>) => response.body),
      tap({
        next: (responseBody) => {
          if (usage) usage.trackSuccess(responseBody.response.took);
        },
        error: (e) => {
          logger.error(e);
          if (usage) usage.trackError();
        },
      }),
      map((responseBody) => ({
        id: responseBody.id,
        isPartial: responseBody.is_partial,
        isRunning: responseBody.is_running,
        rawResponse: responseBody.response,
      }))
    );
  }

  const rollupSearch = async function (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ): Promise<IEsSearchResponse> {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = await context.core.uiSettings.client;
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = toSnakeCase({
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

    // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
    if (options?.abortSignal) options.abortSignal.addEventListener('abort', () => promise.abort());
    const esResponse = await promise;

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
    };
  };

  return { search, cancel };
};
