/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_RULE_CONSUMER, ALERT_RULE_TYPE_ID, SPACE_IDS } from '@kbn/rule-data-utils';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { from } from 'rxjs';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  PluginStartContract as AlertingPluginStartContract,
} from '@kbn/alerting-plugin/server';
import {
  ISearchStrategy,
  PluginStart,
  SearchStrategyDependencies,
  shimHitsTotal,
} from '@kbn/data-plugin/server';
import { ENHANCED_ES_SEARCH_STRATEGY, ISearchOptions } from '@kbn/data-plugin/common';
import { AuditLogger, SecurityPluginSetup } from '@kbn/security-plugin/server';
import { AlertAuditAction, alertAuditEvent } from '@kbn/rule-registry-plugin/server';
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
  alerting: AlertingPluginStartContract,
  logger: Logger,
  security?: SecurityPluginSetup
): ISearchStrategy<TimelineStrategyRequestType<T>, TimelineStrategyResponseType<T>> => {
  const esAsInternal = data.search.searchAsInternalUser;
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const factoryQueryType = request.factoryQueryType;
      const entityType = request.entityType;

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
          auditLogger: securityAuditLogger,
        });
      } else if (entityType != null && entityType === EntityType.SESSIONS) {
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

const timelineAlertsSearchStrategy = <T extends TimelineFactoryQueryTypes>({
  es,
  request,
  options,
  deps,
  queryFactory,
  alerting,
  auditLogger,
}: {
  es: ISearchStrategy;
  request: TimelineStrategyRequestType<T>;
  options: ISearchOptions;
  deps: SearchStrategyDependencies;
  alerting: AlertingPluginStartContract;
  queryFactory: TimelineFactory<T>;
  auditLogger: AuditLogger | undefined;
}) => {
  const indices = request.defaultIndex ?? request.indexType;
  const requestWithAlertsIndices = { ...request, defaultIndex: indices, indexName: indices };

  // Note: Alerts RBAC are built off of the alerting's authorization class, which
  // is why we are pulling from alerting, not ther alertsClient here
  const alertingAuthorizationClient = alerting.getAlertingAuthorizationWithRequest(deps.request);
  const getAuthFilter = async () =>
    alertingAuthorizationClient.getFindAuthorizationFilter(AlertingAuthorizationEntity.Alert, {
      type: AlertingAuthorizationFilterType.ESDSL,
      // Not passing in values, these are the paths for these fields
      fieldNames: {
        consumer: ALERT_RULE_CONSUMER,
        ruleTypeId: ALERT_RULE_TYPE_ID,
        spaceIds: SPACE_IDS,
      },
    });

  return from(getAuthFilter()).pipe(
    mergeMap(({ filter }) => {
      const dsl = queryFactory.buildDsl({
        ...requestWithAlertsIndices,
        authFilter: filter,
      });
      return es.search({ ...requestWithAlertsIndices, params: dsl }, options, deps);
    }),
    map((response) => {
      const rawResponse = shimHitsTotal(response.rawResponse, options);
      // Do we have to loop over each hit? Yes.
      // ecs auditLogger requires that we log each alert independently
      if (auditLogger != null) {
        rawResponse.hits?.hits?.forEach((hit) => {
          auditLogger.log(
            alertAuditEvent({
              action: AlertAuditAction.FIND,
              id: hit._id,
              outcome: 'success',
            })
          );
        });
      }

      return {
        ...response,
        rawResponse,
      };
    }),
    mergeMap((esSearchRes) => queryFactory.parse(requestWithAlertsIndices, esSearchRes)),
    catchError((err) => {
      // check if auth error, if yes, write to ecs logger
      if (auditLogger != null && err?.output?.statusCode === 403) {
        auditLogger.log(
          alertAuditEvent({
            action: AlertAuditAction.FIND,
            outcome: 'failure',
            error: err,
          })
        );
      }

      throw err;
    })
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
