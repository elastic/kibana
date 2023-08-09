/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap } from 'rxjs/operators';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { from } from 'rxjs';
import type {
  EndpointStrategyParseResponseType,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
  EndpointFactoryQueryTypes,
} from '../../../common/search_strategy/endpoint';
import type { EndpointFactory } from './factory/types';

import type { EndpointAppContext } from '../../endpoint/types';
import { endpointFactory } from './factory';

function isObj(req: unknown): req is Record<string, unknown> {
  return typeof req === 'object' && req !== null;
}

function assertValidRequestType<T extends EndpointFactoryQueryTypes>(
  req: unknown
): asserts req is EndpointStrategyRequestType<T> & { factoryQueryType: EndpointFactoryQueryTypes } {
  if (!isObj(req) || req.factoryQueryType == null) {
    throw new Error('factoryQueryType is required');
  }
}

export const endpointSearchStrategyProvider = <T extends EndpointFactoryQueryTypes>(
  data: PluginStart,
  endpointContext: EndpointAppContext
): ISearchStrategy<EndpointStrategyRequestType<T>, EndpointStrategyResponseType<T>> => {
  const es = data.search.getSearchStrategy(
    ENHANCED_ES_SEARCH_STRATEGY
  ) as unknown as ISearchStrategy<
    EndpointStrategyRequestType<T>,
    EndpointStrategyParseResponseType<T>
  >;

  return {
    search: (request, options, deps) => {
      assertValidRequestType<T>(request);

      return from(endpointContext.service.getEndpointAuthz(deps.request)).pipe(
        mergeMap((authz) => {
          const queryFactory: EndpointFactory<T> = endpointFactory[request.factoryQueryType];
          const dsl = queryFactory.buildDsl(request, { authz });
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
                authz,
              })
            )
          );
        })
      );
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
