/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map, mergeMap, catchError } from 'rxjs/operators';
import { from } from 'rxjs';
import { intersection } from 'lodash';
import {
  isValidFeatureId,
  AlertConsumers,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
  SPACE_IDS,
} from '@kbn/rule-data-utils';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import { ISearchStrategy, PluginStart } from '../../../../../src/plugins/data/server';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '../../common/search_strategy';
import {
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
  PluginStartContract as AlertingPluginStartContract,
} from '../../../alerting/server';
import { SecurityPluginSetup } from '../../../security/server';
import { IRuleDataService } from '..';
import { Dataset } from '../rule_data_plugin_service/index_options';
import { MAX_ALERT_SEARCH_SIZE } from '../../common/constants';
import { createQueryFilterClauses } from './build_query';
import { AlertAuditAction, alertAuditEvent } from '../';

const USE_RBAC = [
  AlertConsumers.APM,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.LOGS,
  AlertConsumers.OBSERVABILITY,
];

export const ruleRegistrySearchStrategyProvider = (
  data: PluginStart,
  ruleDataService: IRuleDataService,
  alerting: AlertingPluginStartContract,
  security?: SecurityPluginSetup
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const spaceId = null; // TODO
      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const indices: string[] = request.featureIds.reduce((accum: string[], featureId) => {
        if (!isValidFeatureId(featureId)) {
          throw new Error('this is no good');
        }

        return [
          ...accum,
          ...ruleDataService.findIndicesByFeature(featureId, Dataset.alerts).map((indexInfo) => {
            return featureId === 'siem'
              ? `${indexInfo.baseName}-${spaceId}*`
              : `${indexInfo.baseName}*`;
          }),
        ];
      }, []);

      const queryFilters = [];
      console.log({ request })
      // if (request.query) {
      //   try {
      //     queryFilters.push(...createQueryFilterClauses(request.query));
      //   } catch (err) {
      //     console.error('error', err);
      //   }
      // }

      const alertingAuthorizationClient = alerting.getAlertingAuthorizationWithRequest(
        deps.request
      );
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

      const params = {
        index: indices,
        body: {
          size: MAX_ALERT_SEARCH_SIZE,
          query: {
            bool: {
              filter: queryFilters,
            },
          },
        },
      };

      return from(getAuthFilter()).pipe(
        mergeMap(({ filter }) => {
          if (intersection(USE_RBAC, request.featureIds).length) {
            params.body.query.bool.filter.push(filter);
          }
          return es.search({ ...request, params }, options, deps);
        }),
        map((response) => {
          // Do we have to loop over each hit? Yes.
          // ecs auditLogger requires that we log each alert independently
          if (securityAuditLogger != null) {
            response.rawResponse.hits?.hits?.forEach((hit) => {
              securityAuditLogger.log(
                alertAuditEvent({
                  action: AlertAuditAction.FIND,
                  id: hit._id,
                  outcome: 'success',
                })
              );
            });
          }
          return response;
        }),
        // mergeMap((esSearchRes) => queryFactory.parse(requestWithAlertsIndices, esSearchRes)),
        catchError((err) => {
          // check if auth error, if yes, write to ecs logger
          if (securityAuditLogger != null && err?.output?.statusCode === 403) {
            securityAuditLogger.log(
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
    },
    cancel: async (id, options, deps) => {
      if (es.cancel) {
        return es.cancel(id, options, deps);
      }
    },
  };
};
