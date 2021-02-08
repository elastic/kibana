/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tap } from 'rxjs/operators';
import type { IScopedClusterClient, Logger } from 'kibana/server';
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
  async function cancelAsyncSearch(id: string, esClient: IScopedClusterClient) {
    const client = esClient.asCurrentUser.eql;
    await client.delete({ id });
  }

  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      await cancelAsyncSearch(id, esClient);
    },

    search: ({ id, ...request }, options: IAsyncSearchOptions, { esClient, uiSettingsClient }) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || id}`);

      // @ts-expect-error eql API missing from types
      const client = esClient.asCurrentUser.eql;

      const search = async () => {
        const { track_total_hits: _, ...defaultParams } = await getDefaultSearchParams(
          uiSettingsClient
        );
        const params = id
          ? getDefaultAsyncGetParams(options)
          : {
              ...(await getIgnoreThrottled(uiSettingsClient)),
              ...defaultParams,
              ...getDefaultAsyncGetParams(options),
              ...request.params,
            };
        const promise = id
          ? client.get<EqlSearchResponse>({ ...params, id }, request.options)
          : client.search<EqlSearchResponse>(
              params as EqlSearchStrategyRequest['params'],
              request.options
            );
        const response = await shimAbortSignal(promise, options.abortSignal);
        // @ts-expect-error eql API missing from types
        return toEqlKibanaSearchResponse(response);
      };

      const cancel = async () => {
        if (id) {
          await cancelAsyncSearch(id, esClient);
        }
      };

      return pollSearch(search, cancel, options).pipe(tap((response) => (id = response.id)));
    },

    extend: async (id, keepAlive, options, { esClient }) => {
      logger.debug(`_eql/extend ${id} by ${keepAlive}`);
      // @ts-expect-error eql API missing from types
      await esClient.asCurrentUser.eql.get({ id, keep_alive: keepAlive });
    },
  };
};
