/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { SharedGlobalConfig, RequestHandlerContext, Logger } from '../../../../../src/core/server';
import {
  getTotalLoaded,
  ISearchStrategy,
  SearchUsage,
  getDefaultSearchParams,
  getShardTimeout,
  toSnakeCase,
  shimHitsTotal,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import { ISearchOptions, IEsSearchResponse } from '../../../../../src/plugins/data/common/search';

function isEnhancedEsSearchResponse(response: any): response is IEsSearchResponse {
  return response.hasOwnProperty('isPartial') && response.hasOwnProperty('isRunning');
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const search = async (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ) => {
    logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

    const isAsync = request.indexType !== 'rollup';

    try {
      const response = isAsync
        ? await asyncSearch(context, request, options)
        : await rollupSearch(context, request, options);

      if (
        usage &&
        isAsync &&
        isEnhancedEsSearchResponse(response) &&
        !response.isRunning &&
        !response.isPartial
      ) {
        usage.trackSuccess(response.rawResponse.took);
      }

      return response;
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

  async function asyncSearch(
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ): Promise<IEsSearchResponse> {
    let promise: TransportRequestPromise<any>;
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = await context.core.uiSettings.client;

    const asyncOptions = {
      waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
      keepAlive: '1m', // Extend the TTL for this search request by one minute
    };

    // If we have an ID, then just poll for that ID, otherwise send the entire request body
    if (!request.id) {
      const submitOptions = toSnakeCase({
        batchedReduceSize: 64, // Only report partial results every 64 shards; this should be reduced when we actually display partial results
        ...(await getDefaultSearchParams(uiSettingsClient)),
        ...asyncOptions,
        ...request.params,
      });

      promise = esClient.asyncSearch.submit(submitOptions);
    } else {
      promise = esClient.asyncSearch.get({
        id: request.id,
        ...toSnakeCase(asyncOptions),
      });
    }

    // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
    if (options?.abortSignal) options.abortSignal.addEventListener('abort', () => promise.abort());
    const esResponse = await promise;
    const { id, response, is_partial: isPartial, is_running: isRunning } = esResponse.body;
    return {
      id,
      isPartial,
      isRunning,
      rawResponse: shimHitsTotal(response),
      ...getTotalLoaded(response._shards),
    };
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
      ...getTotalLoaded(response._shards),
    };
  };

  return { search, cancel };
};
