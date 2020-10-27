/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { search } from '../../../../../src/plugins/data/server';
import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';
import { getAsyncOptions, getDefaultSearchParams } from './get_default_search_params';

import type { ISearchStrategy } from '../../../../../src/plugins/data/server';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../common/search/types';

import { toSnakeCase } from '../../../../../src/plugins/data/common/search/es_search';

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

      return doPartialSearch(
        async () => {
          const { ignoreThrottled, ignoreUnavailable } = await getDefaultSearchParams(
            context.core.uiSettings.client
          );

          return context.core.elasticsearch.client.asCurrentUser.eql.search(
            toSnakeCase({
              ignoreThrottled,
              ignoreUnavailable,
              ...asyncOptions,
              ...request.params,
            }),
            requestOptions
          );
        },
        (id) =>
          context.core.elasticsearch.client.asCurrentUser.eql.get(
            toSnakeCase({ id, ...asyncOptions }),
            requestOptions
          ),
        request.id,
        options
      ).pipe(esSearch.toKibanaSearchResponse());
    },
  };
};
