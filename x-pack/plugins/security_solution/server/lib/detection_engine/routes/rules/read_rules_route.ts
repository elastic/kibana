/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import {
  queryRulesSchema,
  QueryRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_rules_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { transformError, buildSiemResponse } from '../utils';
import { readRules } from '../../rules/read_rules';
import { getRuleActionsSavedObject } from '../../rule_actions/get_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const readRulesRoute = (router: IRouter) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<typeof queryRulesSchema, QueryRulesSchemaDecoded>(
          queryRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = queryRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      const { id, rule_id: ruleId } = request.query;

      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;

      try {
        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rule = await readRules({
          alertsClient,
          id,
          ruleId,
        });
        if (rule != null) {
          const ruleActions = await getRuleActionsSavedObject({
            savedObjectsClient,
            ruleAlertId: rule.id,
          });
          const ruleStatuses = await ruleStatusClient.find({
            perPage: 1,
            sortField: 'statusDate',
            sortOrder: 'desc',
            search: rule.id,
            searchFields: ['alertId'],
          });
          const [validated, errors] = transformValidate(
            rule,
            ruleActions,
            ruleStatuses.saved_objects[0]
          );
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
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
