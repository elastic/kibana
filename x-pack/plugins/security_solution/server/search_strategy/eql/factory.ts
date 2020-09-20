/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginStart, ISearchStrategy } from '../../../../../../src/plugins/data/server';
import {
  EqlQueryTypes,
  EqlStrategyRequestType,
  EqlStrategyResponseType,
} from '../../../common/search_strategy/eql';
import { SECURITY_EQL_SEARCH_STRATEGY } from './base';
import { eqlQueryFactory, EqlQueryFactory } from './factory/index';

export const SECURITY_EQL_FACTORY_SEARCH_STRATEGY = 'security_eql_factory';

export const securityEqlFactorySearchStrategyProvider = <T extends EqlQueryTypes>(
  data: PluginStart
): ISearchStrategy<EqlStrategyRequestType<T>, EqlStrategyResponseType<T>> => {
  return {
    search: async (context, request, options) => {
      const eql = data.search.getSearchStrategy(SECURITY_EQL_SEARCH_STRATEGY);

      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: EqlQueryFactory<T> = eqlQueryFactory[request.factoryQueryType];
      const eqlRequest = queryFactory.buildRequest(request);
      const eqlOptions = queryFactory.buildOptions(request, options);

      const response = await eql.search(context, eqlRequest, eqlOptions);

      return queryFactory.parse(request, response);
    },
  };
};
