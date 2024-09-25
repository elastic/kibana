/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs';
import {
  ISearchStrategy,
  PluginStart,
  SearchStrategyDependencies,
  shimHitsTotal,
} from '@kbn/data-plugin/server';
import type { ISearchOptions } from '@kbn/search-types';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { Logger } from '@kbn/logging';
import { z } from '@kbn/zod';

import { searchStrategyRequestSchema } from '../../../common/api/search_strategy';
import {
  TimelineFactoryQueryTypes,
  EntityType,
  TimelineStrategyRequestType,
} from '../../../common/search_strategy/timeline';
import { timelineFactory } from './factory';
import { TimelineFactory } from './factory/types';
import { isAggCardinalityAggregate } from './factory/helpers/is_agg_cardinality_aggregate';

export const timelineSearchStrategyProvider = (
  data: PluginStart,
  logger: Logger,
  _security?: SecurityPluginSetup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ISearchStrategy<z.input<typeof searchStrategyRequestSchema>, any> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      const entityType = request.entityType;

      const searchStrategyRequest = searchStrategyRequestSchema.parse(request);

      const queryFactory = timelineFactory[searchStrategyRequest.factoryQueryType];

      if (entityType != null && entityType === EntityType.SESSIONS) {
        return timelineSessionsSearchStrategy({
          es,
          request: searchStrategyRequest,
          options,
          deps,
          queryFactory,
        });
      } else {
        return timelineSearchStrategy({
          es,
          request: searchStrategyRequest,
          options,
          deps,
          queryFactory,
          logger,
        });
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
  // NOTE: without this parameter, .hits.hits can be empty
  options.retrieveResults = true;

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
  // NOTE: without this parameter, .hits.hits can be empty
  options.retrieveResults = true;
  const indices = request.defaultIndex ?? request.indexType;

  const requestSessionLeaders = {
    ...request,
    defaultIndex: indices,
    indexName: indices,
  } as TimelineStrategyRequestType<T>;

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
