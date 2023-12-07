/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { PatchRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  PatchRuleRequestBody,
  validatePatchRuleRequestBody,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { patchRules } from '../../../logic/crud/patch_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { getIdError } from '../../../utils/utils';
import { transformValidate } from '../../../utils/validate';

export const patchRuleRoute = (router: SecuritySolutionPluginRouter, ml: SetupPlugins['ml']) => {
  router.versioned
    .patch({
      access: 'public',
      path: DETECTION_ENGINE_RULES_URL,
      options: {
        tags: ['access:securitySolution'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            // Use non-exact validation because everything is optional in patch - since everything is optional,
            // io-ts can't find the right schema from the type specific union and the exact check breaks.
            // We do type specific validation after fetching the existing rule so we know the rule type.
            body: buildRouteValidationWithZod(PatchRuleRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<PatchRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validatePatchRuleRequestBody(request.body);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }
        try {
          const params = request.body;
          const rulesClient = (await context.alerting).getRulesClient();
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
          await validateRuleDefaultExceptionList({
            exceptionsList: params.exceptions_list,
            rulesClient,
            ruleRuleId: params.rule_id,
            ruleId: params.id,
          });

          const rule = await patchRules({
            rulesClient,
            existingRule,
            nextParams: params,
          });
          if (rule != null && rule.enabled != null && rule.name != null) {
            return response.ok({
              body: transformValidate(rule),
            });
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
