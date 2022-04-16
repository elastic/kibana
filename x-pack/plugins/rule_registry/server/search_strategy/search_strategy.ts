/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map, mergeMap, catchError } from 'rxjs/operators';
import Boom from '@hapi/boom';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from '@kbn/core/server';
import { from, of } from 'rxjs';
import { isValidFeatureId, AlertConsumers } from '@kbn/rule-data-utils';
import { ENHANCED_ES_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { ISearchStrategy, PluginStart } from '@kbn/data-plugin/server';
import { ReadOperations, PluginStartContract as AlertingStart } from '@kbn/alerting-plugin/server';
import { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '../../common/search_strategy';
import { IRuleDataService } from '..';
import { Dataset } from '../rule_data_plugin_service/index_options';
import { MAX_ALERT_SEARCH_SIZE } from '../../common/constants';
import { AlertAuditAction, alertAuditEvent } from '..';
import { getSpacesFilter, getAuthzFilter } from '../lib';
import { getIsKibanaRequest } from '../lib/get_is_kibana_request';

export const EMPTY_RESPONSE: RuleRegistrySearchResponse = {
  rawResponse: {} as RuleRegistrySearchResponse['rawResponse'],
};

export const RULE_SEARCH_STRATEGY_NAME = 'privateRuleRegistryAlertsSearchStrategy';

export const ruleRegistrySearchStrategyProvider = (
  data: PluginStart,
  ruleDataService: IRuleDataService,
  alerting: AlertingStart,
  logger: Logger,
  security?: SecurityPluginSetup,
  spaces?: SpacesPluginStart
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const internalUserEs = data.search.searchAsInternalUser;
  const requestUserEs = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);
  return {
    search: (request, options, deps) => {
      // We want to ensure this request came from our UI. We can't really do this
      // but we have a best effort we can try
      if (!getIsKibanaRequest(deps.request.headers)) {
        throw Boom.notFound(
          `The ${RULE_SEARCH_STRATEGY_NAME} search strategy is currently only available for internal use.`
        );
      }
      // SIEM uses RBAC fields in their alerts but also utilizes ES DLS which
      // is different than every other solution so we need to special case
      // those requests.
      let siemRequest = false;
      if (request.featureIds.length === 1 && request.featureIds[0] === AlertConsumers.SIEM) {
        siemRequest = true;
      } else if (request.featureIds.includes(AlertConsumers.SIEM)) {
        throw new Error(
          `The ${RULE_SEARCH_STRATEGY_NAME} search strategy is unable to accommodate requests containing multiple feature IDs and one of those IDs is SIEM.`
        );
      }

      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const getActiveSpace = async () => spaces?.spacesService.getActiveSpace(deps.request);
      const getAsync = async () => {
        const [space, authorization] = await Promise.all([
          getActiveSpace(),
          alerting.getAlertingAuthorizationWithRequest(deps.request),
        ]);
        let authzFilter;

        if (!siemRequest) {
          authzFilter = (await getAuthzFilter(
            authorization,
            ReadOperations.Find
          )) as estypes.QueryDslQueryContainer;
        }
        return { space, authzFilter };
      };
      return from(getAsync()).pipe(
        mergeMap(({ space, authzFilter }) => {
          const indices: string[] = request.featureIds.reduce((accum: string[], featureId) => {
            if (!isValidFeatureId(featureId)) {
              logger.warn(
                `Found invalid feature '${featureId}' while using ${RULE_SEARCH_STRATEGY_NAME} search strategy. No alert data from this feature will be searched.`
              );
              return accum;
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

          if (indices.length === 0) {
            return of(EMPTY_RESPONSE);
          }

          const filter = request.query?.bool?.filter
            ? Array.isArray(request.query?.bool?.filter)
              ? request.query?.bool?.filter
              : [request.query?.bool?.filter]
            : [];
          if (authzFilter) {
            filter.push(authzFilter);
          }
          if (space?.id) {
            filter.push(getSpacesFilter(space.id) as estypes.QueryDslQueryContainer);
          }

          const sort = request.sort ?? [];

          const query = {
            bool: {
              filter,
            },
          };
          const size = request.pagination ? request.pagination.pageSize : MAX_ALERT_SEARCH_SIZE;
          const params = {
            index: indices,
            body: {
              _source: false,
              fields: ['*'],
              sort,
              size,
              from: request.pagination ? request.pagination.pageIndex * size : 0,
              query,
            },
          };
          return (siemRequest ? requestUserEs : internalUserEs).search({ params }, options, deps);
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
      if (internalUserEs.cancel) internalUserEs.cancel(id, options, deps);
      if (requestUserEs.cancel) requestUserEs.cancel(id, options, deps);
    },
  };
};
