/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';

import {
  getAsyncOptions,
  getDefaultSearchParams,
  ISearchStrategy,
  toSnakeCase,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import { EqlSearchStrategyRequest, EqlSearchStrategyResponse } from '../../common/search/types';

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
      const asyncOptions = getAsyncOptions();
      const searchOptions = toSnakeCase({ ...request.options });

      if (request.id) {
        promise = eqlClient.get(
          {
            id: request.id,
            ...toSnakeCase(asyncOptions),
          },
          searchOptions
        );
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

        promise = eqlClient.search(
          searchParams as EqlSearchStrategyRequest['params'],
          searchOptions
        );
      }

      const rawResponse = await shimAbortSignal(promise, options?.abortSignal);
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
