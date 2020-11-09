/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../../common/validate';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { updateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/update_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { transformBulkError, buildSiemResponse, createBulkErrorObject } from '../utils';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const updateRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation(updateRulesBulkSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });

      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const idOrRuleIdOrUnknown = payloadRule.id ?? payloadRule.rule_id ?? '(unknown id)';
          try {
            const validationErrors = updateRuleValidateTypeDependents(payloadRule);
            if (validationErrors.length) {
              return createBulkErrorObject({
                ruleId: payloadRule.rule_id,
                statusCode: 400,
                message: validationErrors.join(),
              });
            }

            throwHttpError(await mlAuthz.validateRuleType(payloadRule.type));

            const rule = await updateRules({
              alertsClient,
              savedObjectsClient,
              siemClient,
              ruleUpdate: payloadRule,
            });
            if (rule != null) {
              const ruleActions = await updateRulesNotifications({
                ruleAlertId: rule.id,
                alertsClient,
                savedObjectsClient,
                enabled: payloadRule.enabled ?? true,
                actions: payloadRule.actions,
                throttle: payloadRule.throttle,
                name,
              });
              const ruleStatuses = await ruleStatusClient.find({
                perPage: 1,
                sortField: 'statusDate',
                sortOrder: 'desc',
                search: rule.id,
                searchFields: ['alertId'],
              });
              return transformValidateBulkError(rule.id, rule, ruleActions, ruleStatuses);
            } else {
              return getIdBulkError({ id: payloadRule.id, ruleId: payloadRule.rule_id });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      const [validated, errors] = validate(rules, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
