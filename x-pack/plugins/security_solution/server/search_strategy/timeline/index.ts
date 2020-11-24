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
  TimelineFactoryQueryTypes,
  TimelineStrategyResponseType,
  TimelineStrategyRequestType,
} from '../../../common/search_strategy/timeline';
import { securitySolutionTimelineFactory } from './factory';
import { SecuritySolutionTimelineFactory } from './factory/types';

export const securitySolutionTimelineSearchStrategyProvider = <T extends TimelineFactoryQueryTypes>(
  data: PluginStart
): ISearchStrategy<TimelineStrategyRequestType<T>, TimelineStrategyResponseType<T>> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: SecuritySolutionTimelineFactory<T> =
        securitySolutionTimelineFactory[request.factoryQueryType];
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
