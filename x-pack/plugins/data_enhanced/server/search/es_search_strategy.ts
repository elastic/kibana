/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Observable } from 'rxjs';
import type { Logger, SharedGlobalConfig } from 'kibana/server';
import { first, tap } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { from } from 'rxjs';
import type {
  IEsSearchRequest,
  IEsSearchResponse,
  ISearchOptions,
  ISearchStrategy,
  SearchStrategyDependencies,
  SearchUsage,
} from '../../../../../src/plugins/data/server';
import {
  getDefaultSearchParams,
  getShardTimeout,
  getTotalLoaded,
  searchUsageObserver,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import type { IAsyncSearchOptions } from '../../common';
import { pollSearch } from '../../common';
import {
  getDefaultAsyncGetParams,
  getDefaultAsyncSubmitParams,
  getIgnoreThrottled,
} from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IEsSearchRequest> => {
  function asyncSearch(
    { id, ...request }: IEsSearchRequest,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const client = esClient.asCurrentUser.asyncSearch;

    const search = async () => {
      const params = id
        ? { ...getDefaultAsyncGetParams(), id }
        : { ...(await getDefaultAsyncSubmitParams(uiSettingsClient, options)), ...request.params };
      const promise = id ? client.get(params) : client.submit(params);
      const { body } = await shimAbortSignal(promise, options.abortSignal);
      return toAsyncKibanaSearchResponse(body);
    };

    return pollSearch(search, options).pipe(
      tap((response) => (id = response.id)),
      tap(searchUsageObserver(logger, usage))
    );
  }

  async function rollupSearch(
    request: IEsSearchRequest,
    options: ISearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ): Promise<IEsSearchResponse> {
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = {
      ...getShardTimeout(config),
      ...(await getIgnoreThrottled(uiSettingsClient)),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    };

    const promise = esClient.asCurrentUser.transport.request({
      method,
      path,
      body,
      querystring,
    });

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);
    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...getTotalLoaded(response),
    };
  }

  return {
    search: (request, options: IAsyncSearchOptions, deps) => {
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
