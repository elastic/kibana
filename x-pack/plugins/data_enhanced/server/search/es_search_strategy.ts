/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { mapKeys, snakeCase } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';
import { ApiResponse } from '@elastic/elasticsearch';
import { AsyncSearchGet } from '@elastic/elasticsearch/api/requestParams';
import {
  SharedGlobalConfig,
  RequestHandlerContext,
  ElasticsearchClient,
  Logger,
} from '../../../../../src/core/server';
import {
  getDefaultSearchParams,
  getTotalLoaded,
  ISearchStrategy,
  SearchUsage,
  ISearchOptions,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import { shimHitsTotal } from './shim_hits_total';
import { IEsSearchResponse } from '../../../../../src/plugins/data/common/search/es_search';

interface EnhancedEsSearchResponse extends IEsSearchResponse {
  is_partial: boolean;
  is_running: boolean;
}

function isEnhancedEsSearchResponse(
  response: IEsSearchResponse
): response is EnhancedEsSearchResponse {
  return response.hasOwnProperty('is_partial') && response.hasOwnProperty('is_running');
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
    logger.info(`search ${JSON.stringify(request.params) || request.id}`);
    const config = await config$.pipe(first()).toPromise();
    const caller = context.core.elasticsearch.client.asCurrentUser;
    const defaultParams = getDefaultSearchParams(config);
    const params = { ...defaultParams, ...request.params };

    try {
      const response =
        request.indexType === 'rollup'
          ? await rollupSearch(caller, { ...request, params }, options)
          : await asyncSearch(caller, { ...request, params }, options);

      if (
        usage &&
        (!isEnhancedEsSearchResponse(response) || (!response.is_partial && !response.is_running))
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
    logger.info(`cancel ${id}`);
    await context.core.elasticsearch.client.asCurrentUser.asyncSearch.delete({
      id,
    });
  };

  return { search, cancel };
};

async function asyncSearch(
  caller: ElasticsearchClient,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { timeout = undefined, restTotalHitsAsInt = undefined, ...params } = {
    ...request.params,
  };

  params.trackTotalHits = true; // Get the exact count of hits

  // If we have an ID, then just poll for that ID, otherwise send the entire request body
  const { body = undefined, index = undefined, ...queryParams } = request.id ? {} : params;

  // Only report partial results every 64 shards; this should be reduced when we actually display partial results
  const batchedReduceSize = request.id ? undefined : 64;

  const asyncOptions = {
    waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
    keepAlive: '1m', // Extend the TTL for this search request by one minute
  };

  let esResponse;
  if (request.id) {
    esResponse = await caller.asyncSearch.get(
      toSnakeCase({
        id: request.id,
        ...asyncOptions,
      }) as AsyncSearchGet
    );
  } else {
    esResponse = await caller.asyncSearch.submit(
      toSnakeCase({
        ...asyncOptions,
        ...(batchedReduceSize && { batchedReduceSize }),
        ...queryParams,
      })
    );
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { id, response, is_partial, is_running } = esResponse.body;
  return {
    id,
    is_partial,
    is_running,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
}

async function rollupSearch(
  caller: ElasticsearchClient,
  request: IEnhancedEsSearchRequest,
  options?: ISearchOptions
) {
  const { body, index, ...params } = request.params!;
  const method = 'POST';
  const path = encodeURI(`/${index}/_rollup_search`);
  const querystring = toSnakeCase(params);

  const esResponse = (await caller.transport.request({
    method,
    path,
    body,
    querystring,
  })) as ApiResponse<SearchResponse<any>>;

  return { rawResponse: esResponse.body, ...getTotalLoaded(esResponse.body._shards) };
}

function toSnakeCase(obj: Record<string, any>) {
  return mapKeys(obj, (value, key) => snakeCase(key));
}
