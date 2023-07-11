/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs/operators';
import {
  ISearchStrategy,
  PluginStart,
  SearchStrategyDependencies,
  shimHitsTotal,
} from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY, ISearchOptions } from '@kbn/data-plugin/common';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { Logger } from '@kbn/logging';
import {
  TimelineFactoryQueryTypes,
  TimelineStrategyResponseType,
  TimelineStrategyRequestType,
  EntityType,
} from '../../../common/search_strategy/timeline';
import { timelineFactory } from './factory';
import { TimelineFactory } from './factory/types';
import { isAggCardinalityAggregate } from './factory/helpers/is_agg_cardinality_aggregate';

export const timelineSearchStrategyProvider = <T extends TimelineFactoryQueryTypes>(
  data: PluginStart,
  logger: Logger,
  security?: SecurityPluginSetup
): ISearchStrategy<TimelineStrategyRequestType<T>, TimelineStrategyResponseType<T>> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      const factoryQueryType = request.factoryQueryType;
      const entityType = request.entityType;

      if (factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: TimelineFactory<T> = timelineFactory[factoryQueryType];

      if (entityType != null && entityType === EntityType.SESSIONS) {
        return timelineSessionsSearchStrategy({
          es,
          request,
          options,
          deps,
          queryFactory,
        });
      } else {
        return timelineSearchStrategy({ es, request, options, deps, queryFactory, logger });
      }
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};

const timelineSearchStrategy = <T extends TimelineFactoryQueryTypes>({
  es,
  request,
  options,
  deps,
  queryFactory,
}: {
  es: ISearchStrategy;
  request: TimelineStrategyRequestType<T>;
  options: ISearchOptions;
  deps: SearchStrategyDependencies;
  queryFactory: TimelineFactory<T>;
  logger: Logger;
}) => {
  const dsl = queryFactory.buildDsl(request);
  return es.search({ ...request, params: dsl }, options, deps).pipe(
    map((response) => {
      return {
        ...response,
        rawResponse: shimHitsTotal(response.rawResponse, options),
      };
    }),
    mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
  );
};

const timelineSessionsSearchStrategy = <T extends TimelineFactoryQueryTypes>({
  es,
  request,
  options,
  deps,
  queryFactory,
}: {
  es: ISearchStrategy;
  request: TimelineStrategyRequestType<T>;
  options: ISearchOptions;
  deps: SearchStrategyDependencies;
  queryFactory: TimelineFactory<T>;
}) => {
  const indices = request.defaultIndex ?? request.indexType;

  const requestSessionLeaders = {
    ...request,
    defaultIndex: indices,
    indexName: indices,
  };

  const collapse = {
    field: 'process.entry_leader.entity_id',
  };

  const aggs = {
    total: {
      cardinality: {
        field: 'process.entry_leader.entity_id',
      },
    },
  };

  const dsl = queryFactory.buildDsl(requestSessionLeaders);

  const params = { ...dsl, collapse, aggs };

  return es.search({ ...requestSessionLeaders, params }, options, deps).pipe(
    map((response) => {
      const agg = response.rawResponse.aggregations;
      const aggTotal = isAggCardinalityAggregate(agg, 'total') && agg.total.value;

      // ES doesn't set the hits.total to the collapsed hits.
      // so we are overriding hits.total with the total from the aggregation.
      if (aggTotal) {
        response.rawResponse.hits.total = aggTotal;
      }

      return {
        ...response,
        rawResponse: shimHitsTotal(response.rawResponse, options),
      };
    }),
    mergeMap((esSearchRes) => queryFactory.parse(requestSessionLeaders, esSearchRes))
  );
};
