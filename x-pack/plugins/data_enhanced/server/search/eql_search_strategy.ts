/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { ApiResponse } from '@elastic/elasticsearch';
import { search } from '../../../../../src/plugins/data/server';
import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';
import { getAsyncOptions, getDefaultSearchParams } from './get_default_search_params';

import type { ISearchStrategy } from '../../../../../src/plugins/data/server';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../common/search/types';

import {
  IEsRawSearchResponse,
  toSnakeCase,
} from '../../../../../src/plugins/data/common/search/es_search';

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

    search: (request, options, context) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || request.id}`);

      const { esSearch } = search;
      const asyncOptions = getAsyncOptions();
      const requestOptions = toSnakeCase({ ...request.options });
      const client = context.core.elasticsearch.client.asCurrentUser.eql;

      return doPartialSearch<ApiResponse<IEsRawSearchResponse>>(
        async () => {
          const { ignoreThrottled, ignoreUnavailable } = await getDefaultSearchParams(
            context.core.uiSettings.client
          );

          return client.search(
            toSnakeCase({
              ignoreThrottled,
              ignoreUnavailable,
              ...asyncOptions,
              ...request.params,
            }) as EqlSearchStrategyRequest['params'],
            requestOptions
          );
        },
        (id) =>
          client.get(
            {
              id: id!,
              ...toSnakeCase(asyncOptions),
            },
            requestOptions
          ),
        (response) => !(response.body.is_partial && response.body.is_running),
        (response) => response.body.id,
        request.id,
        options
      ).pipe(esSearch.toKibanaSearchResponse());
    },
  };
};
