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
} from '../../../../../../../src/plugins/data/server';
import {
  EqlSearchStrategyResponse,
  EQL_SEARCH_STRATEGY,
} from '../../../../../data_enhanced/common';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import {
  TimelineEqlRequestOptions,
  TimelineEqlResponse,
} from '../../../../common/search_strategy/timeline/events/eql';
import { buildEqlDsl, parseEqlResponse } from './helpers';

export const securitySolutionTimelineEqlSearchStrategyProvider = (
  data: PluginStart
): ISearchStrategy<TimelineEqlRequestOptions, TimelineEqlResponse> => {
  const esEql = data.search.getSearchStrategy(EQL_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      const dsl = buildEqlDsl(request);
      return esEql.search({ ...request, params: dsl }, options, deps).pipe(
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse),
            },
          };
        }),
        mergeMap((esSearchRes) =>
          parseEqlResponse(
            request,
            (esSearchRes as unknown) as EqlSearchStrategyResponse<EqlSearchResponse<unknown>>
          )
        )
      );
    },
    cancel: async (id, options, deps) => {
      if (esEql.cancel) {
        return esEql.cancel(id, options, deps);
      }
    },
  };
};
