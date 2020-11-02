/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { from } from 'rxjs';
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
  getAsyncOptions,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import {
  ISearchOptions,
  IEsSearchResponse,
  isCompleteResponse,
} from '../../../../../src/plugins/data/common/search';

function isEnhancedEsSearchResponse(response: any): response is IEsSearchResponse {
  return response.hasOwnProperty('isPartial') && response.hasOwnProperty('isRunning');
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const search = (
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    context: RequestHandlerContext
  ) =>
    from(
      new Promise<IEsSearchResponse>(async (resolve, reject) => {
        logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

        const isAsync = request.indexType !== 'rollup';

        try {
          const response = isAsync
            ? await asyncSearch(request, options, context)
            : await rollupSearch(request, options, context);

          if (
            usage &&
            isAsync &&
            isEnhancedEsSearchResponse(response) &&
            isCompleteResponse(response)
          ) {
            usage.trackSuccess(response.rawResponse.took);
          }

          resolve(response);
        } catch (e) {
          if (usage) usage.trackError();
          reject(e);
        }
      })
    );

  const cancel = async (context: RequestHandlerContext, id: string) => {
    logger.debug(`cancel ${id}`);
    await context.core.elasticsearch.client.asCurrentUser.asyncSearch.delete({
      id,
    });
  };

  async function asyncSearch(
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    context: RequestHandlerContext
  ): Promise<IEsSearchResponse> {
    let promise: TransportRequestPromise<any>;
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = await context.core.uiSettings.client;
    const asyncOptions = getAsyncOptions();

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

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);
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

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...getTotalLoaded(response._shards),
    };
  };

  return { search, cancel };
};
