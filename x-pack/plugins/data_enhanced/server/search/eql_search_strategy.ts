/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { tap } from 'rxjs/operators';
import type { Logger } from 'kibana/server';
import type { ISearchStrategy } from '../../../../../src/plugins/data/server';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
  IAsyncSearchOptions,
} from '../../common';
import { getDefaultSearchParams, shimAbortSignal } from '../../../../../src/plugins/data/server';
import { pollSearch } from '../../common';
import { getDefaultAsyncGetParams, getIgnoreThrottled } from './request_utils';
import { toEqlKibanaSearchResponse } from './response_utils';
import { EqlSearchResponse } from './types';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      await esClient.asCurrentUser.eql.delete({ id });
    },

    search: ({ id, ...request }, options: IAsyncSearchOptions, { esClient, uiSettingsClient }) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || id}`);

      const client = esClient.asCurrentUser.eql;

      const search = async () => {
        const { track_total_hits: _, ...defaultParams } = await getDefaultSearchParams(
          uiSettingsClient
        );
        const params = id
          ? getDefaultAsyncGetParams()
          : {
              ...(await getIgnoreThrottled(uiSettingsClient)),
              ...defaultParams,
              ...getDefaultAsyncGetParams(),
              ...request.params,
            };
        const promise = id
          ? client.get<EqlSearchResponse>({ ...params, id }, request.options)
          : client.search<EqlSearchResponse>(
              params as EqlSearchStrategyRequest['params'],
              request.options
            );
        const response = await shimAbortSignal(promise, options.abortSignal);
        return toEqlKibanaSearchResponse(response);
      };

      return pollSearch(search, options).pipe(tap((response) => (id = response.id)));
    },
  };
};
