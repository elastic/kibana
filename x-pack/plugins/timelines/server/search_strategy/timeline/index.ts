/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, mergeMap, catchError } from 'rxjs/operators';
import { from } from 'rxjs';
import {
  isValidFeatureId,
  mapConsumerToIndexName,
  ALERTS_CONSUMERS,
} from '@kbn/rule-data-utils/target/alerts_as_data_rbac';

import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  PluginStartContract as AlertPluginStartContract,
} from '../../../../alerting/server';
import {
  ISearchStrategy,
  PluginStart,
  SearchStrategyDependencies,
  shimHitsTotal,
} from '../../../../../../src/plugins/data/server';
import {
  TimelineFactoryQueryTypes,
  TimelineStrategyResponseType,
  TimelineStrategyRequestType,
  EntityType,
} from '../../../common/search_strategy/timeline';
import { timelineFactory } from './factory';
import { TimelineFactory } from './factory/types';
import {
  ENHANCED_ES_SEARCH_STRATEGY,
  ISearchOptions,
} from '../../../../../../src/plugins/data/common';

export const timelineSearchStrategyProvider = <T extends TimelineFactoryQueryTypes>(
  data: PluginStart,
  alerting: AlertPluginStartContract
): ISearchStrategy<TimelineStrategyRequestType<T>, TimelineStrategyResponseType<T>> => {
  const esAsInternal = data.search.searchAsInternalUser;
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const factoryQueryType = request.factoryQueryType;
      const entityType = request.entityType;
      const alertConsumers = request.alertConsumers;

      if (factoryQueryType == null) {
        throw new Error('factoryQueryType is required');
      }

      const queryFactory: TimelineFactory<T> = timelineFactory[factoryQueryType];

      if (entityType != null && entityType === EntityType.ALERTS) {
        return timelineAlertsSearchStrategy({
          es: esAsInternal,
          request,
          options,
          deps,
          queryFactory,
          alerting,
          alertConsumers: alertConsumers ?? [],
        });
      } else {
        return timelineSearchStrategy({ es, request, options, deps, queryFactory });
      }
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      } else if (esAsInternal.cancel) {
        return esAsInternal.cancel(id, options, deps);
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
}) => {
  const { entityType, alertConsumers, ...rest } = request;
  const dsl = queryFactory.buildDsl(request);
  return es.search({ request: { ...rest }, params: dsl }, options, deps).pipe(
    map((response) => {
      return {
        ...response,
        ...{
          rawResponse: shimHitsTotal(response.rawResponse, options),
        },
      };
    }),
    mergeMap((esSearchRes) => queryFactory.parse(request, esSearchRes))
  );
};

const timelineAlertsSearchStrategy = <T extends TimelineFactoryQueryTypes>({
  es,
  request,
  options,
  deps,
  queryFactory,
  alerting,
  alertConsumers,
}: {
  es: ISearchStrategy;
  request: TimelineStrategyRequestType<T>;
  options: ISearchOptions;
  deps: SearchStrategyDependencies;
  alerting: AlertPluginStartContract;
  queryFactory: TimelineFactory<T>;
  alertConsumers: ALERTS_CONSUMERS[];
}) => {
  const allFeatureIdsValid = alertConsumers.every((id) => isValidFeatureId(id));

  if (!allFeatureIdsValid) {
    throw new Error('An invalid alerts consumer feature id was provided');
  }

  const indices = alertConsumers.flatMap((consumer) => mapConsumerToIndexName[consumer]);
  const requestWithAlertsIndices = { ...request, defaultIndex: indices };

  // Note: Alerts RBAC are built off of the alerting's authorization class, which
  // is why we are pulling from alerting, not ther alertsClient here
  const alertingAuthorizationClient = alerting.getAlertingAuthorizationWithRequest(deps.request);

  const getAuthFilter = async () =>
    alertingAuthorizationClient.getFindAuthorizationFilter(AlertingAuthorizationEntity.Alert, {
      type: AlertingAuthorizationFilterType.ESDSL,
      fieldNames: {
        consumer: 'kibana.rac.alert.owner',
        ruleTypeId: 'rule.id',
        spaceIds: 'kibana.space_ids',
      },
    });

  return from(getAuthFilter()).pipe(
    mergeMap(({ filter }) => {
      const dsl = queryFactory.buildDsl({ ...requestWithAlertsIndices, authFilter: filter });
      return es.search({ ...requestWithAlertsIndices, params: dsl }, options, deps);
    }),
    map((response) => {
      return {
        ...response,
        ...{
          rawResponse: shimHitsTotal(response.rawResponse, options),
        },
      };
    }),
    mergeMap((esSearchRes) => queryFactory.parse(requestWithAlertsIndices, esSearchRes)),
    catchError((err) => {
      throw err;
    })
  );
};
