/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchStrategy, PluginStart } from '../../../../../../src/plugins/data/server';
import {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
} from '../../../common/search_strategy/security_solution';
import { securitySolutionFactory } from './factory';
import { SecuritySolutionFactory } from './factory/types';

export const securitySolutionSearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  const es = data.search.getSearchStrategy('es');

  return {
    search: async (context, request, options) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: SecuritySolutionFactory<T> =
        securitySolutionFactory[request.factoryQueryType];
      const dsl = queryFactory.buildDsl(request);
      const esSearchRes = await es.search(context, { ...request, params: dsl }, options);
      return queryFactory.parse(request, esSearchRes);
    },
    cancel: async (context, id) => {
      if (es.cancel) {
        es.cancel(context, id);
      }
    },
  };
};
