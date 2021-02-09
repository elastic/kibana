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
import { getRuleActionsSavedObject } from '../../rule_actions/get_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

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

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rules = await findRules({
          alertsClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
          fields: query.fields,
        });

        // if any rules attempted to execute but failed before the rule executor is called,
        // an execution status will be written directly onto the rule via the kibana alerting framework,
        // which we are filtering on and will write a failure status
        // for any rules found to be in a failing state into our rule status saved objects
        const failingRules = rules.data.filter(
          (rule) => rule.executionStatus != null && rule.executionStatus.status === 'error'
        );

        const ruleStatuses = await Promise.all(
          rules.data.map(async (rule) => {
            const results = await ruleStatusClient.find({
              perPage: 1,
              sortField: 'statusDate',
              sortOrder: 'desc',
              search: rule.id,
              searchFields: ['alertId'],
            });
            const failingRule = failingRules.find((badRule) => badRule.id === rule.id);
            if (failingRule != null) {
              if (results.saved_objects.length > 0) {
                results.saved_objects[0].attributes.status = 'failed';
                results.saved_objects[0].attributes.lastFailureAt = failingRule.executionStatus.lastExecutionDate.toISOString();
              }
            }
            return results;
          })
        );
        const ruleActions = await Promise.all(
          rules.data.map(async (rule) => {
            const results = await getRuleActionsSavedObject({
              savedObjectsClient,
              ruleAlertId: rule.id,
            });

            return results;
          })
        );

        const [validated, errors] = transformValidateFindAlerts(rules, ruleActions, ruleStatuses);
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
