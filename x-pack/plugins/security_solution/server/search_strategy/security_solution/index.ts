/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { z } from '@kbn/zod';
import { searchStrategyRequestSchema } from '../../../common/api/search_strategy';
import { securitySolutionFactory } from './factory';
import type { EndpointAppContext } from '../../endpoint/types';

export const securitySolutionSearchStrategyProvider = (
  data: PluginStart,
  endpointContext: EndpointAppContext,
  getSpaceId?: (request: KibanaRequest) => string,
  ruleDataClient?: IRuleDataClient | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ISearchStrategy<z.input<typeof searchStrategyRequestSchema>, any> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const parsedRequest = searchStrategyRequestSchema.parse(request);

      const queryFactory = securitySolutionFactory[parsedRequest.factoryQueryType];

      const dsl = queryFactory.buildDsl(parsedRequest);
      return es.search({ ...request, params: dsl }, options, deps).pipe(
        map((response) => {
          return {
            ...response,
            ...{
              rawResponse: shimHitsTotal(response.rawResponse, options),
            },
          };
        }),
        mergeMap((esSearchRes) =>
          queryFactory.parse(parsedRequest, esSearchRes, {
            esClient: deps.esClient,
            savedObjectsClient: deps.savedObjectsClient,
            endpointContext,
            request: deps.request,
            spaceId: getSpaceId && getSpaceId(deps.request),
            ruleDataClient,
          })
        )
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
