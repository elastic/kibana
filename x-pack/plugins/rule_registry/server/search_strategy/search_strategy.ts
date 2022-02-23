/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { map, mergeMap, catchError } from 'rxjs/operators';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from 'src/core/server';
import { from, of } from 'rxjs';
import { isValidFeatureId } from '@kbn/rule-data-utils';
import { ENHANCED_ES_SEARCH_STRATEGY } from '../../../../../src/plugins/data/common';
import { ISearchStrategy, PluginStart } from '../../../../../src/plugins/data/server';
import {
  RuleRegistrySearchRequest,
  RuleRegistrySearchResponse,
} from '../../common/search_strategy';
import { ReadOperations, PluginStartContract as AlertingStart } from '../../../alerting/server';
import { SecurityPluginSetup } from '../../../security/server';
import { SpacesPluginStart } from '../../../spaces/server';
import { IRuleDataService } from '..';
import { Dataset } from '../rule_data_plugin_service/index_options';
import { MAX_ALERT_SEARCH_SIZE } from '../../common/constants';
import { AlertAuditAction, alertAuditEvent } from '../';
import { getSpacesFilter, getAuthzFilter } from '../lib';

export const EMPTY_RESPONSE: RuleRegistrySearchResponse = {
  rawResponse: {} as RuleRegistrySearchResponse['rawResponse'],
};

export const ruleRegistrySearchStrategyProvider = (
  data: PluginStart,
  ruleDataService: IRuleDataService,
  alerting: AlertingStart,
  logger: Logger,
  security?: SecurityPluginSetup,
  spaces?: SpacesPluginStart
): ISearchStrategy<RuleRegistrySearchRequest, RuleRegistrySearchResponse> => {
  const es = data.search.getSearchStrategy(ENHANCED_ES_SEARCH_STRATEGY);

  return {
    search: (request, options, deps) => {
      const securityAuditLogger = security?.audit.asScoped(deps.request);
      const getActiveSpace = async () => spaces?.spacesService.getActiveSpace(deps.request);
      const getAsync = async () => {
        const [space, authorization] = await Promise.all([
          getActiveSpace(),
          alerting.getAlertingAuthorizationWithRequest(deps.request),
        ]);
        const authzFilter = (await getAuthzFilter(
          authorization,
          ReadOperations.Find
        )) as estypes.QueryDslQueryContainer;
        return { space, authzFilter };
      };
      return from(getAsync()).pipe(
        mergeMap(({ space, authzFilter }) => {
          const indices: string[] = request.featureIds.reduce((accum: string[], featureId) => {
            if (!isValidFeatureId(featureId)) {
              logger.warn(
                `Found invalid feature '${featureId}' while using rule registry search strategy. No alert data from this feature will be searched.`
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

          const query = {
            bool: {
              ...request.query?.bool,
              filter,
            },
          };
          const params = {
            index: indices,
            body: {
              _source: false,
              fields: ['*'],
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
