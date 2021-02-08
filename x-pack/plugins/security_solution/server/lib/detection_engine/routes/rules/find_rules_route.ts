/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/find_rules_type_dependents';
import {
  findRulesSchema,
  FindRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { transformValidateFindAlerts } from './validate';
import { transformError, buildSiemResponse } from '../utils';
import { bulkFetchRuleActionsOfManyRules, getRuleActionsSavedObject, RulesActionsSavedObject } from '../../rule_actions/get_rule_actions_saved_object';
import { RuleStatusSavedObjectsClient, ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IScopedClusterClient, ElasticsearchClient, SavedObjectsFindResult } from '../../../../../../../../src/core/server';
import { IRuleSavedAttributesSavedObjectAttributes, IRuleStatusSOAttributes } from '../../rules/types';

export const findRulesRoute = (router: SecuritySolutionPluginRouter) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find`,
      validate: {
        query: buildRouteValidation<typeof findRulesSchema, FindRulesSchemaDecoded>(
          findRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = findRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const { query } = request;
        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const elasticsearchClient = context.core.elasticsearch.client;

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        // const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rules = await findRules({
          alertsClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
          fields: query.fields,
        });

        if (rules.data.length === 0) {
          const [validated, errors] = transformValidateFindAlerts(rules, [], []);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        }

        const ruleIds = rules.data.map((rule) => rule.id);

        // // if any rules attempted to execute but failed before the rule executor is called,
        // // an execution status will be written directly onto the rule via the kibana alerting framework,
        // // which we are filtering on and will write a failure status
        // // for any rules found to be in a failing state into our rule status saved objects
        // const failingRules = rules.data.filter(
        //   (rule) => rule.executionStatus != null && rule.executionStatus.status === 'error'
        // );

        // const ruleStatuses = await Promise.all(
        //   rules.data.map(async (rule) => {
        //     const results = await ruleStatusClient.find({
        //       perPage: 1,
        //       sortField: 'statusDate',
        //       sortOrder: 'desc',
        //       search: rule.id,
        //       searchFields: ['alertId'],
        //     });
        //     const failingRule = failingRules.find((badRule) => badRule.id === rule.id);
        //     if (failingRule != null) {
        //       if (results.saved_objects.length > 0) {
        //         results.saved_objects[0].attributes.status = 'failed';
        //         results.saved_objects[0].attributes.lastFailureAt = failingRule.executionStatus.lastExecutionDate.toISOString();
        //       }
        //     }
        //     return results;
        //   })
        // );

        // const ruleActions = await Promise.all(
        //   rules.data.map(async (rule) => {
        //     const results = await getRuleActionsSavedObject({
        //       savedObjectsClient,
        //       ruleAlertId: rule.id,
        //     });

        //     return results;
        //   })
        // );

        const [ruleActions, ruleStatuses] = await Promise.all([
          bulkFetchRuleActionsOfManyRules({ savedObjectsClient, ruleIds }),
          bulkFetchLatestStatusesOfManyRules(elasticsearchClient.asCurrentUser, ruleIds),
        ]);

        // if any rules attempted to execute but failed before the rule executor is called,
        // an execution status will be written directly onto the rule via the kibana alerting framework,
        // which we are filtering on and will write a failure status
        // for any rules found to be in a failing state into our rule status saved objects
        rules.data.forEach((rule) => {
          const isRuleFailing =
            rule.executionStatus != null && rule.executionStatus.status === 'error';

          if (isRuleFailing) {
            const ruleStatus = ruleStatuses.find((status) => status.alertId === rule.id);
            if (ruleStatus != null) {
              ruleStatus.status = 'failed';
              ruleStatus.lastFailureAt = rule.executionStatus.lastExecutionDate.toISOString();
            }
          }
        });

        const ruleStatusesFindResultMock = ruleStatuses.map((status) => {
          return {
            saved_objects: [{ attributes: status }] as Array<
              SavedObjectsFindResult<IRuleSavedAttributesSavedObjectAttributes>
            >,
            total: 0,
            per_page: 0,
            page: 0,
          };
        });

        const [validated, errors] = transformValidateFindAlerts(
          rules,
          ruleActions,
          ruleStatusesFindResultMock
        );
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};

// const bulkFetchRuleActionsOfManyRules = async (
//   client: ElasticsearchClient,
//   ruleIds: string[]
// ): Promise<Array<RulesActionsSavedObject | null>> => {
//   if (ruleIds.length === 0) {
//     return [];
//   }

//   const response = await client.search({
//     index: '.kibana',
//     ignore_unavailable: true,
//     size: ruleIds.length,
//     body: {
//       size: ruleIds.length,
//       query: {
//         bool: {
//           filter: [
//             { term: { type: 'siem-detection-engine-rule-actions' } },
//             { terms: { 'siem-detection-engine-rule-actions.ruleAlertId': ruleIds } },
//           ],
//         },
//       },
//     },
//   });

//   const actionsHits = response.body.hits?.hits ?? [];
//   const actions = actionsHits.filter(Boolean).map((hit: any) => {
//     const id = hit._id;
//     const attributes = hit._source?.['siem-detection-engine-rule-actions'] ?? {};
//     return { id, ...attributes };
//   });

//   return actions.filter(Boolean) as RulesActionsSavedObject[];
// };

const bulkFetchLatestStatusesOfManyRules = async (
  client: ElasticsearchClient,
  ruleIds: string[]
): Promise<IRuleSavedAttributesSavedObjectAttributes[]> => {
  // This is not only a performance optimization. If ids is empty, the search
  // request to Elasticsearch using terms aggregation will throw a 400 error,
  // which is not what we want here.
  if (ruleIds.length === 0) {
    return [];
  }

  const response = await client.search({
    index: '.kibana',
    ignore_unavailable: true,
    size: 0,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { type: 'siem-detection-engine-rule-status' } },
            { terms: { 'siem-detection-engine-rule-status.alertId': ruleIds } },
          ],
        },
      },
      aggs: {
        rules: {
          terms: {
            field: 'siem-detection-engine-rule-status.alertId',
            size: ruleIds.length,
          },
          aggs: {
            latest_status: {
              top_hits: {
                size: 1,
                sort: [{ 'siem-detection-engine-rule-status.statusDate': { order: 'desc' } }],
              },
            },
          },
        },
      },
    },
  });

  const ruleBuckets = response.body.aggregations?.rules?.buckets ?? [];
  const statusHits = ruleBuckets.map((bucket: any) => {
    const [firstHit] = bucket?.latest_status?.hits?.hits ?? [];
    return firstHit ?? null;
  });
  const statuses = statusHits.map((hit: any) => {
    return hit?._source?.['siem-detection-engine-rule-status'] ?? null;
  });

  return statuses.filter(Boolean) as IRuleSavedAttributesSavedObjectAttributes[];
};
