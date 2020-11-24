/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, mergeMap } from 'rxjs/operators';
import {
  ISearchStrategy,
  PluginStart,
  shimHitsTotal,
} from '../../../../../../src/plugins/data/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../data_enhanced/common';
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
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: SecuritySolutionFactory<T> =
        securitySolutionFactory[request.factoryQueryType];
      const dsl = queryFactory.buildDsl(request);
      return es.search({ ...request, params: dsl }, options, deps).pipe(
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse),
            },
          };
        }),
        mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
