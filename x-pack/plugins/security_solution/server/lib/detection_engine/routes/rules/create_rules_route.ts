/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { readRules } from '../../rules/read_rules';
import { getIndexExists } from '../../index/get_index_exists';
import { transformError, buildSiemResponse } from '../utils';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { createRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { newTransformValidate } from './validate';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';
import { RuleTypeParams } from '../../types';
import { Alert } from '../../../../../../alerts/common';

export const createRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml']
): void => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(createRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = createRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const clusterClient = context.core.elasticsearch.legacy.client;
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution?.getAppClient();

        if (!siemClient || !alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        if (request.body.rule_id != null) {
          const rule = await readRules({
            alertsClient,
            ruleId: request.body.rule_id,
            id: undefined,
          });
          if (rule != null) {
            return siemResponse.error({
              statusCode: 409,
              body: `rule_id: "${request.body.rule_id}" already exists`,
            });
          }
        }

        const internalRule = convertCreateAPIToInternalSchema(request.body, siemClient);

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));

        const indexExists = await getIndexExists(
          clusterClient.callAsCurrentUser,
          internalRule.params.outputIndex
        );
        if (!indexExists) {
          return siemResponse.error({
            statusCode: 400,
            body: `To create a rule, the index must exist first. Index ${internalRule.params.outputIndex} does not exist`,
          });
        }

        // This will create the endpoint list if it does not exist yet
        await context.lists?.getExceptionListClient().createEndpointList();

        /**
         * TODO: Remove this use of `as` by utilizing the proper type
         */
        const createdRule = (await alertsClient.create({
          data: internalRule,
        })) as Alert<RuleTypeParams>;

        const ruleActions = await updateRulesNotifications({
          ruleAlertId: createdRule.id,
          alertsClient,
          savedObjectsClient,
          enabled: createdRule.enabled,
          actions: request.body.actions,
          throttle: request.body.throttle ?? null,
          name: createdRule.name,
        });

        const ruleStatuses = await ruleStatusSavedObjectsClientFactory(savedObjectsClient).find({
          perPage: 1,
          sortField: 'statusDate',
          sortOrder: 'desc',
          search: `${createdRule.id}`,
          searchFields: ['alertId'],
        });
        const [validated, errors] = newTransformValidate(
          createdRule,
          ruleActions,
          ruleStatuses.saved_objects[0]
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
