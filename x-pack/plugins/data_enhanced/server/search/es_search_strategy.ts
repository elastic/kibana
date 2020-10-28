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
import { SharedGlobalConfig, Logger } from '../../../../../src/core/server';
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
  SearchStrategyDependencies,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import {
  ISearchOptions,
  IEsSearchResponse,
  isCompleteResponse,
} from '../../../../../src/plugins/data/common';

function isEnhancedEsSearchResponse(response: any): response is IEsSearchResponse {
  return response.hasOwnProperty('isPartial') && response.hasOwnProperty('isRunning');
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IEnhancedEsSearchRequest> => {
  return {
    search: (request, options, deps) =>
      from(
        new Promise<IEsSearchResponse>(async (resolve, reject) => {
          logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

          const isAsync = request.indexType !== 'rollup';

          try {
            const response = isAsync
              ? await asyncSearch(request, options, deps)
              : await rollupSearch(request, options, deps);

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
      ),
    cancel: async (id, options, { esClient }) => {
      logger.debug(`cancel ${id}`);
      await esClient.asCurrentUser.asyncSearch.delete({ id });
    },
  };

  async function asyncSearch(
    request: IEnhancedEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    let promise: TransportRequestPromise<any>;
    const asyncOptions = getAsyncOptions();

    // If we have an ID, then just poll for that ID, otherwise send the entire request body
    if (!request.id) {
      const submitOptions = toSnakeCase({
        batchedReduceSize: 64, // Only report partial results every 64 shards; this should be reduced when we actually display partial results
        keepOnCompletion: true, // Return an ID even when the search returns in the first response
        ...(await getDefaultSearchParams(uiSettingsClient)),
        ...asyncOptions,
        ...request.params,
      });

      promise = esClient.asCurrentUser.asyncSearch.submit(submitOptions);
    } else {
      promise = esClient.asCurrentUser.asyncSearch.get({
        id: request.id,
        ...toSnakeCase(asyncOptions),
      });
    }

    const esResponse = await shimAbortSignal(promise, options.abortSignal);
    const { id, response, is_partial: isPartial, is_running: isRunning } = esResponse.body;
    return {
      id,
      isPartial,
      isRunning,
      rawResponse: shimHitsTotal(response),
      ...getTotalLoaded(response._shards),
    };
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
    const querystring = toSnakeCase({
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

    const esResponse = await shimAbortSignal(promise, options.abortSignal);

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...getTotalLoaded(response._shards),
    };
  }
};
