/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import { DETECTION_ENGINE_RULES_BULK_CREATE } from '../../../../../../../common/constants';
import {
  BulkCreateRulesRequestBody,
  validateCreateRuleProps,
  BulkCrudRulesResponse,
} from '../../../../../../../common/detection_engine/rule_management';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import type { SetupPlugins } from '../../../../../../plugin';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { createRules } from '../../../logic/crud/create_rules';
import { readRules } from '../../../logic/crud/read_rules';
import { getDuplicates } from './get_duplicates';
import { transformValidateBulkError } from '../../../utils/validate';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';

import {
  transformBulkError,
  createBulkErrorObject,
  buildSiemResponse,
} from '../../../../routes/utils';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 */
export const bulkCreateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_BULK_CREATE,
      validate: {
        body: buildRouteValidation(BulkCreateRulesRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_CREATE);

      const siemResponse = buildSiemResponse(response);

      const ctx = await context.resolve(['core', 'securitySolution', 'licensing', 'alerting']);

      const rulesClient = ctx.alerting.getRulesClient();
      const savedObjectsClient = ctx.core.savedObjects.client;

      const mlAuthz = buildMlAuthz({
        license: ctx.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });

      const ruleDefinitions = request.body;
      const dupes = getDuplicates(ruleDefinitions, 'rule_id');

      const rules = await Promise.all(
        ruleDefinitions
          .filter((rule) => rule.rule_id == null || !dupes.includes(rule.rule_id))
          .map(async (payloadRule) => {
            if (payloadRule.rule_id != null) {
              const rule = await readRules({
                id: undefined,
                rulesClient,
                ruleId: payloadRule.rule_id,
              });
              if (rule != null) {
                return createBulkErrorObject({
                  ruleId: payloadRule.rule_id,
                  statusCode: 409,
                  message: `rule_id: "${payloadRule.rule_id}" already exists`,
                });
              }
            }

            try {
              const validationErrors = validateCreateRuleProps(payloadRule);
              if (validationErrors.length) {
                return createBulkErrorObject({
                  ruleId: payloadRule.rule_id,
                  statusCode: 400,
                  message: validationErrors.join(),
                });
              }

              throwAuthzError(await mlAuthz.validateRuleType(payloadRule.type));

              const createdRule = await createRules({
                rulesClient,
                params: payloadRule,
              });

              return transformValidateBulkError(createdRule.params.ruleId, createdRule, null);
            } catch (err) {
              return transformBulkError(
                payloadRule.rule_id,
                err as Error & { statusCode?: number }
              );
            }
          })
      );
      const rulesBulk = [
        ...rules,
        ...dupes.map((ruleId) =>
          createBulkErrorObject({
            ruleId,
            statusCode: 409,
            message: `rule_id: "${ruleId}" already exists`,
          })
        ),
      ];
      const [validated, errors] = validate(rulesBulk, BulkCrudRulesResponse);
      if (errors != null) {
        return siemResponse.error({
          statusCode: 500,
          body: errors,
          headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_CREATE),
        });
      } else {
        return response.ok({
          body: validated ?? {},
          headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_CREATE),
        });
      }
    }
  );
};
