/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { readRules } from '../../../logic/crud/read_rules';
import { buildSiemResponse } from '../../../../routes/utils';

import { createRulesSchema } from '../../../../../../../common/detection_engine/schemas/request';
import { transformValidate } from '../../../utils/validate';
import { createRuleValidateTypeDependents } from '../../../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { createRules } from '../../../logic/crud/create_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';

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
        const ctx = await context.resolve([
          'core',
          'securitySolution',
          'licensing',
          'alerting',
          'lists',
        ]);

        const rulesClient = ctx.alerting.getRulesClient();
        const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
        const savedObjectsClient = ctx.core.savedObjects.client;

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

        const mlAuthz = buildMlAuthz({
          license: ctx.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwAuthzError(await mlAuthz.validateRuleType(request.body.type));

        // This will create the endpoint list if it does not exist yet
        await ctx.lists?.getExceptionListClient().createEndpointList();
        checkDefaultRuleExceptionListReferences({
          exceptionLists: request.body.exceptions_list,
        });
        const createdRule = await createRules({
          rulesClient,
          params: request.body,
        });

        const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(createdRule.id);

        const [validated, errors] = transformValidate(createdRule, ruleExecutionSummary);
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
