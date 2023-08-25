/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs/operators';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { FactoryQueryTypes } from '../../../common/search_strategy/security_solution';
import { securitySolutionFactory } from './factory';
import type { EndpointAppContext } from '../../endpoint/types';

function isObj(req: unknown): req is Record<string, unknown> {
  return typeof req === 'object' && req !== null;
}
function assertValidRequestType(
  req: unknown
): asserts req is { factoryQueryType: FactoryQueryTypes } {
  if (!isObj(req) || req.factoryQueryType == null) {
    throw new Error('factoryQueryType is required');
  }
}

export const securitySolutionSearchStrategyProvider = (
  data: PluginStart,
  endpointContext: EndpointAppContext,
  getSpaceId?: (request: KibanaRequest) => string,
  ruleDataClient?: IRuleDataClient | null
  // TODO: add type for this
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ISearchStrategy<any, any> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      assertValidRequestType(request);

      const queryFactory = securitySolutionFactory[request.factoryQueryType];

      const dsl = queryFactory.buildDsl(request);
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
          queryFactory.parse(request, esSearchRes, {
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
