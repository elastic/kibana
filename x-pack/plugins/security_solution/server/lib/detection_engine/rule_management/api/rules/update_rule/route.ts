/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { updateRulesSchema } from '../../../../../../../common/detection_engine/schemas/request';
import { updateRuleValidateTypeDependents } from '../../../../../../../common/detection_engine/rule_management/api/rules/update_rule/update_rules_type_dependents';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { buildSiemResponse } from '../../../../routes/utils';

import { getIdError } from '../../../utils/utils';
import { transformValidate } from '../../../utils/validate';
import { updateRules } from '../../../logic/crud/update_rules';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';
import { readRules } from '../../../logic/crud/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';

export const updateRulesRoute = (router: SecuritySolutionPluginRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(updateRulesSchema),
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
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing']);

        const rulesClient = ctx.alerting.getRulesClient();
        const savedObjectsClient = ctx.core.savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: ctx.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });
        throwAuthzError(await mlAuthz.validateRuleType(request.body.type));

        checkDefaultRuleExceptionListReferences({ exceptionLists: request.body.exceptions_list });

        const existingRule = await readRules({
          rulesClient,
          ruleId: request.body.rule_id,
          id: request.body.id,
        });

        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule: existingRule,
        });
        const rule = await updateRules({
          rulesClient,
          existingRule: migratedRule,
          ruleUpdate: request.body,
        });

        if (rule != null) {
          const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);
          const [validated, errors] = transformValidate(rule, ruleExecutionSummary);
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
