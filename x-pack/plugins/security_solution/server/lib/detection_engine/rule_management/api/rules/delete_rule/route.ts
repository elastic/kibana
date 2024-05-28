/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { DeleteRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  DeleteRuleRequestQuery,
  validateQueryRuleByIds,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/rule_management/read_rules';
import { getIdError, transform } from '../../../utils/utils';

export const deleteRuleRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .delete({
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
            query: buildRouteValidationWithZod(DeleteRuleRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<DeleteRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateQueryRuleByIds(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        try {
          const { id, rule_id: ruleId } = request.query;

          const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
          const rulesClient = ctx.alerting.getRulesClient();
          const rulesManagementClient = ctx.securitySolution.getRulesManagementClient();

          const rule = await readRules({ rulesClient, id, ruleId });

          if (!rule) {
            const error = getIdError({ id, ruleId });
            return siemResponse.error({
              body: error.message,
              statusCode: error.statusCode,
            });
          }

          await rulesManagementClient.deleteRule({
            ruleId: rule.id,
          });

          const transformed = transform(rule);
          if (transformed == null) {
            return siemResponse.error({ statusCode: 500, body: 'failed to transform alert' });
          } else {
            return response.ok({ body: transformed ?? {} });
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
