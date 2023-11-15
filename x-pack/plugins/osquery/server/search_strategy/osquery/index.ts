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
} from '../../../common/search_strategy/osquery';
import { osqueryFactory } from './factory';
import type { OsqueryFactory } from './factory/types';

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
          const strictRequest = {
            factoryQueryType: request.factoryQueryType,
            kuery: request.kuery,
            ...('pagination' in request ? { pagination: request.pagination } : {}),
            ...('sort' in request ? { sort: request.sort } : {}),
            ...('actionId' in request ? { actionId: request.actionId } : {}),
            ...('startDate' in request ? { startDate: request.startDate } : {}),
            ...('agentId' in request ? { agentId: request.agentId } : {}),
          } as StrategyRequestType<T>;

          const dsl = queryFactory.buildDsl({
            ...strictRequest,
            componentTemplateExists: exists,
          } as StrategyRequestType<T>);
          // use internal user for searching .fleet* indices
          es =
            dsl.index?.includes('fleet') || dsl.index?.includes('logs-osquery_manager.action')
              ? data.search.searchAsInternalUser
              : data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

          return es.search(
            {
              ...strictRequest,
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
