/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { RuleUpdateProps } from '../../../../../../../common/api/detection_engine/model/rule_schema';
import type { UpdateRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import { validateUpdateRuleProps } from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/crud/read_rules';
import { updateRules } from '../../../logic/crud/update_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { getIdError } from '../../../utils/utils';
import { transformValidate, validateResponseActionsPermissions } from '../../../utils/validate';

export const updateRuleRoute = (router: SecuritySolutionPluginRouter, ml: SetupPlugins['ml']) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(RuleUpdateProps),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response): Promise<IKibanaResponse<UpdateRuleResponse>> => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = validateUpdateRuleProps(request.body);
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

        await validateRuleDefaultExceptionList({
          exceptionsList: request.body.exceptions_list,
          rulesClient,
          ruleRuleId: request.body.rule_id,
          ruleId: request.body.id,
        });

        const existingRule = await readRules({
          rulesClient,
          ruleId: request.body.rule_id,
          id: request.body.id,
        });

        await validateResponseActionsPermissions(ctx.securitySolution, request.body, existingRule);

        const rule = await updateRules({
          rulesClient,
          existingRule,
          ruleUpdate: request.body,
        });

        if (rule != null) {
          const [validated, errors] = transformValidate(rule);
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
