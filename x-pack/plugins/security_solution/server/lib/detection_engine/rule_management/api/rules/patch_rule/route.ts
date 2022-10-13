/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { patchRuleValidateTypeDependents } from '../../../../../../../common/detection_engine/schemas/request/patch_rules_type_dependents';
import { buildRouteValidationNonExact } from '../../../../../../utils/build_validation/route_validation';
import { patchRulesSchema } from '../../../../../../../common/detection_engine/schemas/request/patch_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { patchRules } from '../../../logic/crud/patch_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { getIdError } from '../../../utils/utils';
import { transformValidate } from '../../../utils/validate';
import { readRules } from '../../../logic/crud/read_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';

export const patchRulesRoute = (router: SecuritySolutionPluginRouter, ml: SetupPlugins['ml']) => {
  router.patch(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        // Use non-exact validation because everything is optional in patch - since everything is optional,
        // io-ts can't find the right schema from the type specific union and the exact check breaks.
        // We do type specific validation after fetching the existing rule so we know the rule type.
        body: buildRouteValidationNonExact<typeof patchRulesSchema>(patchRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = patchRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
        const params = request.body;
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleExecutionLog = (await context.securitySolution).getRuleExecutionLog();
        const savedObjectsClient = (await context.core).savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: (await context.licensing).license,
          ml,
          request,
          savedObjectsClient,
        });
        if (params.type) {
          // reject an unauthorized "promotion" to ML
          throwAuthzError(await mlAuthz.validateRuleType(params.type));
        }

        const existingRule = await readRules({
          rulesClient,
          ruleId: params.rule_id,
          id: params.id,
        });
        if (existingRule?.params.type) {
          // reject an unauthorized modification of an ML rule
          throwAuthzError(await mlAuthz.validateRuleType(existingRule?.params.type));
        }

        checkDefaultRuleExceptionListReferences({ exceptionLists: params.exceptions_list });

        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule: existingRule,
        });

        const rule = await patchRules({
          rulesClient,
          existingRule: migratedRule,
          nextParams: params,
        });
        if (rule != null && rule.enabled != null && rule.name != null) {
          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);

          const [validated, errors] = transformValidate(rule, ruleExecutionSummary);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id: params.id, ruleId: params.rule_id });
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
