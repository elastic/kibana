/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { ISearchStrategy } from '../../../../../../src/plugins/data/server';
import {
  EqlQueryTypes,
  EqlStrategyRequestType,
  EqlStrategyResponseType,
} from '../../../common/search_strategy/eql';
import { eqlQueryFactory } from './factory';
import { EqlQueryFactory } from './factory/types';

export const EQL_SEARCH_STRATEGY = 'eql';

export const eqlSearchStrategyProvider = <T extends EqlQueryTypes>(
  logger: Logger
): ISearchStrategy<EqlStrategyRequestType<T>, EqlStrategyResponseType<T>> => {
  return {
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${request.params?.index}`);

      try {
        if (request.factoryQueryType == null) {
          throw new Error('factoryQueryType is required');
        }
        const queryFactory: EqlQueryFactory<T> = eqlQueryFactory[request.factoryQueryType];
        const dsl = queryFactory.buildDsl(request);

        // Temporary workaround until https://github.com/elastic/elasticsearch-js/issues/1297
        const promise = context.core.elasticsearch.client.asCurrentUser.eql.search(dsl);
        if (options?.abortSignal)
          options.abortSignal.addEventListener('abort', () => promise.abort());
        const response = await promise;

        return queryFactory.parse(request, response);
      } catch (e) {
        logger.debug(`_eql/search error: ${e}`);
        throw e;
      }
    },
  };
};
