/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { ReadRuleResponse } from '../../../../../../../common/api/detection_engine/rule_management';
import {
  ReadRuleRequestQuery,
  validateQueryRuleByIds,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidationWithZod } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { readRules } from '../../../logic/detection_rules_client/read_rules';
import { getIdError, transform } from '../../../utils/utils';

export const readRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
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
            query: buildRouteValidationWithZod(ReadRuleRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ReadRuleResponse>> => {
        const siemResponse = buildSiemResponse(response);
        const validationErrors = validateQueryRuleByIds(request.query);
        if (validationErrors.length) {
          return siemResponse.error({ statusCode: 400, body: validationErrors });
        }

        const { id, rule_id: ruleId } = request.query;

        try {
          const rulesClient = (await context.alerting).getRulesClient();

          // TODO: https://github.com/elastic/kibana/issues/125642 Reuse fetchRuleById
          const rule = await readRules({
            id,
            rulesClient,
            ruleId,
          });
          if (rule != null) {
            const transformed = transform(rule);
            if (transformed == null) {
              return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
            } else {
              return response.ok({ body: transformed ?? {} });
            }
          } else {
            const error = getIdError({ id, ruleId });
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
