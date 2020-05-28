/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { deleteRules } from '../../rules/delete_rules';
import { queryRulesSchema } from '../schemas/query_rules_schema';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import { DeleteRuleRequestParams } from '../../rules/types';
import { deleteNotifications } from '../../notifications/delete_notifications';
import { deleteRuleActionsSavedObject } from '../../rule_actions/delete_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const deleteRulesRoute = (router: IRouter) => {
  router.delete(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<DeleteRuleRequestParams>(queryRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { id, rule_id: ruleId } = request.query;

        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rule = await deleteRules({
          alertsClient,
          id,
          ruleId,
        });
        if (rule != null) {
          await deleteNotifications({ alertsClient, ruleAlertId: rule.id });
          await deleteRuleActionsSavedObject({
            ruleAlertId: rule.id,
            savedObjectsClient,
          });
          const ruleStatuses = await ruleStatusClient.find({
            perPage: 6,
            search: rule.id,
            searchFields: ['alertId'],
          });
          ruleStatuses.saved_objects.forEach(async (obj) => ruleStatusClient.delete(obj.id));
          const [validated, errors] = transformValidate(
            rule,
            undefined,
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
