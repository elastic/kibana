/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, map, mergeMap } from 'rxjs';
import type { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { shimHitsTotal } from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type { CoreStart } from '@kbn/core/server';
import { ACTIONS_INDEX } from '../../../common/constants';
import type {
  FactoryQueryTypes,
  StrategyResponseType,
  StrategyRequestType,
  ResultsRequestOptions,
} from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import type { OsqueryFactory } from './factory/types';
import type { RequestOptionsPaginated } from '../../../common/search_strategy/osquery';

export const osquerySearchStrategyProvider = <T extends FactoryQueryTypes>(
  data: PluginStart,
  esClient: CoreStart['elasticsearch']['client']
): ISearchStrategy<StrategyRequestType<T>, StrategyResponseType<T>> => {
  let es: typeof data.search.searchAsInternalUser;

  return {
    search: (request, options, deps) => {
      if (request.factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: OsqueryFactory<T> = osqueryFactory[request.factoryQueryType];

      return from(
        esClient.asInternalUser.indices.exists({
          index: `${ACTIONS_INDEX}*`,
        })
      ).pipe(
        mergeMap((exists) => {
          const requestWithOptionalTypes = {
            factoryQueryType: request.factoryQueryType,
            kql: request.kql,
            ...((request as RequestOptionsPaginated).pagination
              ? { pagination: (request as RequestOptionsPaginated).pagination }
              : {}),
            ...((request as RequestOptionsPaginated).sort
              ? { sort: (request as RequestOptionsPaginated).sort }
              : {}),
            ...((request as ResultsRequestOptions).actionId
              ? { actionId: (request as ResultsRequestOptions).actionId }
              : {}),
            ...((request as ResultsRequestOptions).agentId
              ? { agentId: (request as ResultsRequestOptions).agentId }
              : {}),
            componentTemplateExists: exists,
          } as StrategyRequestType<T>;
          const dsl = queryFactory.buildDsl(requestWithOptionalTypes);
          // use internal user for searching .fleet* indices
          es =
            dsl.index?.includes('fleet') || dsl.index?.includes('logs-osquery_manager.action')
              ? data.search.searchAsInternalUser
              : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

          return es.search(
            {
              ...requestWithOptionalTypes,
              params: dsl,
            },
            options,
            deps
          );
        }),
        map((response) => ({
          ...response,
          ...{
            rawResponse: shimHitsTotal(response.rawResponse, options),
          },
          total: response.rawResponse.hits.total as number,
        })),
        mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
      );
    },
    cancel: async (id, options, deps) => {
      if (es?.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
