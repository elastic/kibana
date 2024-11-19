/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, from } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import type {
  EndpointStrategyParseResponseType,
  EndpointStrategyRequestType,
  EndpointStrategyResponseType,
  EndpointFactoryQueryTypes,
} from '../../../common/search_strategy/endpoint';
import type { EndpointFactory } from './factory/types';

import type { EndpointAppContext } from '../../endpoint/types';
import { endpointFactory } from './factory';

export const endpointSearchStrategyProvider = <T extends EndpointFactoryQueryTypes>(
  data: PluginStart,
  endpointContext: EndpointAppContext
): ISearchStrategy<EndpointStrategyRequestType<T>, EndpointStrategyResponseType<T>> => {
  const es = data.search.searchAsInternalUser as unknown as ISearchStrategy<
    EndpointStrategyRequestType<T>,
    EndpointStrategyParseResponseType<T>
  >;

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }
      return from(endpointContext.service.getEndpointAuthz(deps.request)).pipe(
        mergeMap((authz) => {
          const queryFactory: EndpointFactory<T> = endpointFactory[request.factoryQueryType];
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            sort: request.sort,
            ...('alertIds' in request ? { alertIds: request.alertIds } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
            ...('expiration' in request ? { expiration: request.expiration } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('agents' in request ? { agents: request.agents } : {}),
          } as EndpointStrategyRequestType<T>;
          const dsl = queryFactory.buildDsl(strictRequest, { authz });

          return es.search({ ...strictRequest, params: dsl }, options, deps).pipe(
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
