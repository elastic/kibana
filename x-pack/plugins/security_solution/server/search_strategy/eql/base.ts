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
import { EqlSearchResponse } from '../../lib/types';

export const SECURITY_EQL_SEARCH_STRATEGY = 'security_eql_base';

const dummyResponseFields = {
  _shards: {
    total: -1,
    successful: -1,
    failed: -1,
    skipped: -1,
  },
  hits: {
    max_score: -1,
    total: -1,
    hits: [],
  },
};

export const securityEqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${request.params?.index}`);

      try {
        const promise = context.core.elasticsearch.client.asCurrentUser.eql.search<
          EqlSearchResponse<unknown>
        >(request.params, request.options);
        // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
        if (options?.abortSignal)
          options.abortSignal.addEventListener('abort', () => promise.abort());
        const response = await promise;

        return {
          rawResponse: {
            ...response.body,
            ...dummyResponseFields,
          },
          rawEqlResponse: response.body,
        };
      } catch (e) {
        logger.debug(`_eql/search error: ${e}`);
        throw e;
      }
    },
  };
};
