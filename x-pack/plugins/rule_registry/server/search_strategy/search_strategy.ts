/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map, mergeMap, catchError } from 'rxjs/operators';
import { buildEsQuery, Filter } from '@kbn/es-query';
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
import { SpacesPluginStart } from '../../../spaces/server';
import { IRuleDataService } from '..';
import { Dataset } from '../rule_data_plugin_service/index_options';
import { MAX_ALERT_SEARCH_SIZE } from '../../common/constants';
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
  security?: SecurityPluginSetup,
  spaces?: SpacesPluginStart
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const alertingAuthorizationClient = alerting.getAlertingAuthorizationWithRequest(
        deps.request
      );
      const getActiveSpace = async () => spaces?.spacesService.getActiveSpace(deps.request);
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
      const getAsync = async () => {
        const promises: Array<Promise<any>> = [getActiveSpace()];
        if (intersection(USE_RBAC, request.featureIds).length > 0) {
          promises.push(getAuthFilter());
        }
        const [space, filter] = await Promise.all(promises);
        return { filter, space };
      };
      return from(getAsync()).pipe(
        mergeMap(({ filter, space }) => {
          let esQuery;
          if (typeof request.query === 'string') {
            esQuery = { query: request.query, language: 'kuery' };
          } else if (request.query != null && typeof request.query === 'object') {
            esQuery = [];
          }

          const filters: Filter[] = [];
          if (filter) {
            filters.push(filter.filter as unknown as Filter);
          }

          const query = buildEsQuery(
            undefined,
            esQuery == null ? { query: ``, language: 'kuery' } : esQuery,
            filters
          );

          const indices: string[] = request.featureIds.reduce((accum: string[], featureId) => {
            if (!isValidFeatureId(featureId)) {
              throw new Error('this is no good');
            }

            return [
              ...accum,
              ...ruleDataService
                .findIndicesByFeature(featureId, Dataset.alerts)
                .map((indexInfo) => {
                  return featureId === 'siem'
                    ? `${indexInfo.baseName}-${space?.id ?? ''}*`
                    : `${indexInfo.baseName}*`;
                }),
            ];
          }, []);

          const params = {
            index: indices,
            body: {
              size: MAX_ALERT_SEARCH_SIZE,
              query,
            },
          };
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
