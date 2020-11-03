/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tap } from 'rxjs/operators';
import type { ISearchStrategy } from '../../../../../src/plugins/data/server';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  IAsyncSearchOptions,
} from '../../common';
import {
  getDefaultSearchParams,
  searchUsageObserver,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import { pollSearch } from '../../common';
import { getDefaultAsyncGetParams, getIgnoreThrottled } from './request_utils';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      await esClient.asCurrentUser.eql.delete({ id });
    },

    search: ({ id, ...request }, options: IAsyncSearchOptions, { esClient, uiSettingsClient }) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || request.id}`);

      const client = esClient.asCurrentUser.eql;

      const search = async () => {
        const params = id
          ? { id, ...getDefaultAsyncGetParams() }
          : {
              ...(await getIgnoreThrottled(uiSettingsClient)),
              ...(await getDefaultSearchParams(uiSettingsClient)),
              ...getDefaultAsyncGetParams(),
              ...request.params,
            };
        const promise = id
          ? client.get(params, request.options)
          : client.search(params, request.options);
        const { body } = await shimAbortSignal(promise, options.abortSignal);
        return {
          id: body.id,
          rawResponse: body,
          isPartial: body.is_partial,
          isRunning: body.is_running,
        };
      };

      return pollSearch(search, options).pipe(
        tap((response) => (id = response.id)),
        tap(searchUsageObserver(logger, usage))
      );
    },
  };
};
