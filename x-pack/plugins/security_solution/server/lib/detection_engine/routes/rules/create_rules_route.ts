/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import {
  DETECTION_ENGINE_RULES_URL,
  NOTIFICATION_THROTTLE_NO_ACTIONS,
} from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { readRules } from '../../rules/read_rules';
import { buildSiemResponse } from '../utils';

import { createRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { newTransformValidate } from './validate';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';

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
        const rulesClient = context.alerting.getRulesClient();
        const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
        const savedObjectsClient = context.core.savedObjects.client;
        const siemClient = context.securitySolution.getAppClient();

        if (request.body.rule_id != null) {
          const rule = await readRules({
            rulesClient,
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
        throwAuthzError(await mlAuthz.validateRuleType(internalRule.params.type));

        // This will create the endpoint list if it does not exist yet
        await context.lists?.getExceptionListClient().createEndpointList();

        const createdRule = await rulesClient.create({
          data: internalRule,
        });

        // mutes if we are creating the rule with the explicit "no_actions"
        if (request.body.throttle === NOTIFICATION_THROTTLE_NO_ACTIONS) {
          await rulesClient.muteAll({ id: createdRule.id });
        }

        const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(createdRule.id);

        const [validated, errors] = newTransformValidate(createdRule, ruleExecutionSummary);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
        }
      } catch (err) {
        const error = transformError(err as Error);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
