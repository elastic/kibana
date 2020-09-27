/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';

import {
  getDefaultSearchParams,
  ISearchStrategy,
  toSnakeCase,
} from '../../../../../../src/plugins/data/server';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../common/search_strategy/eql';

export const EQL_SEARCH_STRATEGY = 'eql';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    cancel: async (context, id) => {
      logger.debug(`_eql/delete ${id}`);
      await context.core.elasticsearch.client.asCurrentUser.eql.delete({
        id,
      });
    },
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || request.id}`);
      let promise: TransportRequestPromise<ApiResponse>;
      const eqlClient = context.core.elasticsearch.client.asCurrentUser.eql;
      const uiSettingsClient = await context.core.uiSettings.client;
      const asyncOptions = {
        waitForCompletionTimeout: '100ms', // Wait up to 100ms for the response to return
        keepAlive: '1m', // Extend the TTL for this search request by one minute
      };

      if (request.id) {
        promise = eqlClient.get({
          id: request.id,
          ...toSnakeCase(asyncOptions),
        });
      } else {
        const { ignoreThrottled, ignoreUnavailable } = await getDefaultSearchParams(
          uiSettingsClient
        );
        const searchParams = toSnakeCase({
          ignoreThrottled,
          ignoreUnavailable,
          ...asyncOptions,
          ...request.params,
        });
        const searchOptions = toSnakeCase({ ...request.options });

        promise = eqlClient.search(
          searchParams as EqlSearchStrategyRequest['params'],
          searchOptions as EqlSearchStrategyRequest['options']
        );
      }

      // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
      if (options?.abortSignal)
        options.abortSignal.addEventListener('abort', () => promise.abort());
      const rawResponse = await promise;
      const { id, is_partial: isPartial, is_running: isRunning } = rawResponse.body;

      return {
        id,
        isPartial,
        isRunning,
        rawResponse,
      };
    },
  };
};
