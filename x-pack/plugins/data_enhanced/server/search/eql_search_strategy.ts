/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import type { Logger } from 'kibana/server';
import type { ApiResponse } from '@elastic/elasticsearch';

import { search } from '../../../../../src/plugins/data/server';
import { doPartialSearch } from '../../common/search/es_search/es_search_rxjs_utils';
import { getAsyncOptions, getDefaultSearchParams } from './get_default_search_params';

import type { ISearchStrategy, IEsRawSearchResponse } from '../../../../../src/plugins/data/server';
import type {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../common/search/types';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    cancel: async (id, options, { esClient }) => {
      logger.debug(`_eql/delete ${id}`);
      await esClient.asCurrentUser.eql.delete({
        id,
      });
    },

    search: (request, options, { esClient, uiSettingsClient }) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || request.id}`);

      const { utils } = search.esSearch;
      const asyncOptions = getAsyncOptions();
      const requestOptions = utils.toSnakeCase({ ...request.options });
      const client = esClient.asCurrentUser.eql;

      return doPartialSearch<ApiResponse<IEsRawSearchResponse>>(
        async () => {
          const { ignoreThrottled, ignoreUnavailable } = await getDefaultSearchParams(
            uiSettingsClient
          );

          return client.search(
            utils.toSnakeCase({
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
              ...utils.toSnakeCase(asyncOptions),
            },
            requestOptions
          ),
        (response) => !response.body.is_running,
        (response) => response.body.id,
        request.id,
        options
      ).pipe(utils.toKibanaSearchResponse());
    },
  };
};
