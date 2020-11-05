/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchStrategy, PluginStart } from '../../../../../../src/plugins/data/server';
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
    search: async (context, request, options) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      const queryFactory: SecuritySolutionTimelineFactory<T> =
        securitySolutionTimelineFactory[request.factoryQueryType];
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
