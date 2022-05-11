/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs/operators';
import { ISearchStrategy, PluginStart, shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
} from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import { OsqueryFactory } from './factory/types';

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  let es: typeof data.search.searchAsInternalUser;

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: OsqueryFactory<T> = osqueryFactory[request.factoryQueryType];
      const dsl = queryFactory.buildDsl(request);

      // use internal user for searching .fleet* indicies
      es = dsl.index?.includes('fleet')
        ? data.search.searchAsInternalUser
        : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

      return es
        .search(
          {
            ...request,
            params: dsl,
          },
          options,
          deps
        )
        .pipe(
          map((response) => ({
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse),
            },
          })),
          mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
        );
    },
    cancel: async (id, options, deps) => {
      if (es?.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
