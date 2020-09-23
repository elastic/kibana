/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { ISearchStrategy } from '../../../../../../src/plugins/data/server';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../common/search_strategy/eql';

export const EQL_SEARCH_STRATEGY = 'eql';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${request.params?.index}`);

      try {
        const promise = context.core.elasticsearch.client.asCurrentUser.eql.search(
          request.params,
          request.options
        );
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
      } catch (e) {
        logger.debug(`_eql/search error: ${e}`);
        throw e;
      }
    },
  };
};
