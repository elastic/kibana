/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { CreateRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  CreateRuleRequestBody,
  validateCreateRuleProps,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/rule_management/read_rules';
import { checkDefaultRuleExceptionListReferences } from '../../../logic/exceptions/check_for_default_rule_exception_list';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { transformValidate, validateResponseActionsPermissions } from '../../../utils/validate';

export const createRuleRoute = (router: SecuritySolutionPluginRouter): void => {
  router.versioned
    .post({
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
            body: buildRouteValidationWithZod(CreateRuleRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<CreateRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateCreateRuleProps(request.body);
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
          const rulesManagementClient = ctx.securitySolution.getRulesManagementClient();
          const exceptionsClient = ctx.lists?.getExceptionListClient();

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

          // This will create the endpoint list if it does not exist yet
          await exceptionsClient?.createEndpointList();
          checkDefaultRuleExceptionListReferences({
            exceptionLists: request.body.exceptions_list,
          });

          await validateRuleDefaultExceptionList({
            exceptionsList: request.body.exceptions_list,
            rulesClient,
            ruleRuleId: undefined,
            ruleId: undefined,
          });

          await validateResponseActionsPermissions(ctx.securitySolution, request.body);

          const createdRule = await rulesManagementClient.createCustomRule({
            params: request.body,
          });

          return response.ok({
            body: transformValidate(createdRule),
          });
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
