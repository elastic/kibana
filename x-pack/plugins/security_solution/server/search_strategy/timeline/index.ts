/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mergeMap } from 'rxjs/operators';
import { ISearchStrategy, PluginStart } from '../../../../../../src/plugins/data/server';
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
  const es = data.search.getSearchStrategy('es');

  return {
    search: (request, options, context) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: SecuritySolutionTimelineFactory<T> =
        securitySolutionTimelineFactory[request.factoryQueryType];
      const dsl = queryFactory.buildDsl(request);

      return es
        .search({ ...request, params: dsl }, options, context)
        .pipe(mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes)));
    },
    cancel: async (context, id) => {
      if (es.cancel) {
        es.cancel(context, id);
      }
    },
  };
};
