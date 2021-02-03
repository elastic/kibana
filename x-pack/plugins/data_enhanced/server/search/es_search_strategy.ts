/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Observable } from 'rxjs';
import type { IScopedClusterClient, Logger, SharedGlobalConfig } from 'kibana/server';
import { catchError, first, tap } from 'rxjs/operators';
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
  shimHitsTotal,
} from '../../../../../src/plugins/data/server';
import type { IAsyncSearchOptions } from '../../common';
import { pollSearch } from '../../common';
import {
  getDefaultAsyncGetParams,
  getDefaultAsyncSubmitParams,
  getIgnoreThrottled,
} from './request_utils';
import { toAsyncKibanaSearchResponse } from './response_utils';
import { AsyncSearchResponse } from './types';
import { getKbnServerError, KbnServerError } from '../../../../../src/plugins/kibana_utils/server';

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy<IEsSearchRequest> => {
  async function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    try {
      await esClient.asCurrentUser.asyncSearch.delete({ id });
    } catch (e) {
      throw getKbnServerError(e);
    }
  }

  function asyncSearch(
    { id, ...request }: IEsSearchRequest,
    options: IAsyncSearchOptions,
    { esClient, uiSettingsClient }: SearchStrategyDependencies
  ) {
    const client = esClient.asCurrentUser.asyncSearch;

    const search = async () => {
      const params = id
        ? getDefaultAsyncGetParams()
        : { ...(await getDefaultAsyncSubmitParams(uiSettingsClient, options)), ...request.params };
      const promise = id
        ? client.get<AsyncSearchResponse>({ ...params, id })
        : client.submit<AsyncSearchResponse>(params);
      const { body } = await shimAbortSignal(promise, options.abortSignal);
      const response = shimHitsTotal(body.response, options);
      return toAsyncKibanaSearchResponse({ ...body, response });
    };

    const cancel = async () => {
      if (id) {
        await cancelAsyncSearch(id, esClient);
      }
    };

    return pollSearch(search, cancel, options).pipe(
      tap((response) => (id = response.id)),
      tap(searchUsageObserver(logger, usage)),
      catchError((e) => {
        throw getKbnServerError(e);
      })
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

    try {
      const promise = esClient.asCurrentUser.transport.request({
        method,
        path,
        body,
        querystring,
      });

      const esResponse = await shimAbortSignal(promise, options?.abortSignal);
      const response = esResponse.body as SearchResponse<any>;
      return {
        rawResponse: shimHitsTotal(response, options),
        ...getTotalLoaded(response),
      };
    } catch (e) {
      throw getKbnServerError(e);
    }
  }

  return {
    /**
     * @param request
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Observable<IEsSearchResponse<any>>`
     * @throws `KbnServerError`
     */
    search: (request, options: IAsyncSearchOptions, deps) => {
      logger.debug(`search ${JSON.stringify(request.params) || request.id}`);
      if (request.indexType && request.indexType !== 'rollup') {
        throw new KbnServerError('Unknown indexType', 400);
      }

      if (request.indexType === undefined) {
        return asyncSearch(request, options, deps);
      } else {
        return from(rollupSearch(request, options, deps));
      }
    },
    /**
     * @param id async search ID to cancel, as returned from _async_search API
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Promise<void>`
     * @throws `KbnServerError`
     */
    cancel: async (id, options, { esClient }) => {
      logger.debug(`cancel ${id}`);
      await cancelAsyncSearch(id, esClient);
    },
    /**
     *
     * @param id async search ID to extend, as returned from _async_search API
     * @param keepAlive
     * @param options
     * @param deps `SearchStrategyDependencies`
     * @returns `Promise<void>`
     * @throws `KbnServerError`
     */
    extend: async (id, keepAlive, options, { esClient }) => {
      logger.debug(`extend ${id} by ${keepAlive}`);
      try {
        await esClient.asCurrentUser.asyncSearch.get({ id, keep_alive: keepAlive });
      } catch (e) {
        throw getKbnServerError(e);
      }
    },
  };
};
