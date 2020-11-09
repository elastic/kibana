/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fullUpdateSchema } from '../../../../../common/detection_engine/schemas/request/rule_schemas';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { transformError, buildSiemResponse } from '../utils';
import { getIdError } from './utils';
import { transformValidate } from './validate';
import { updateRules } from '../../rules/update_rules';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

export const updateRulesRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(fullUpdateSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = updateRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();
        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(request.body.type));

        const rule = await updateRules({
          alertsClient,
          savedObjectsClient,
          siemClient,
          ruleUpdate: request.body,
        });

        if (rule != null) {
          const ruleActions = await updateRulesNotifications({
            ruleAlertId: rule.id,
            alertsClient,
            savedObjectsClient,
            enabled: request.body.enabled ?? true,
            actions: request.body.actions,
            throttle: request.body.throttle,
            name: request.body.name,
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
          const error = getIdError({ id: request.body.id, ruleId: request.body.rule_id });
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
