/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { updateRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/update_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { transformBulkError, buildSiemResponse, createBulkErrorObject } from '../utils';
import { updateRules } from '../../rules/update_rules';
import { legacyMigrate } from '../../rules/utils';
import { readRules } from '../../rules/read_rules';

export const updateRulesBulkRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml']
) => {
  router.put(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_update`,
      validate: {
        body: buildRouteValidation(updateRulesBulkSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const rulesClient = context.alerting.getRulesClient();
      const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution.getAppClient();

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });

      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const idOrRuleIdOrUnknown = payloadRule.id ?? payloadRule.rule_id ?? '(unknown id)';
          try {
            const validationErrors = updateRuleValidateTypeDependents(payloadRule);
            if (validationErrors.length) {
              return createBulkErrorObject({
                ruleId: payloadRule.rule_id,
                statusCode: 400,
                message: validationErrors.join(),
              });
            }

            throwAuthzError(await mlAuthz.validateRuleType(payloadRule.type));

            const existingRule = await readRules({
              rulesClient,
              ruleId: payloadRule.rule_id,
              id: payloadRule.id,
            });

            const migratedRule = await legacyMigrate({
              rulesClient,
              savedObjectsClient,
              rule: existingRule,
            });

            const rule = await updateRules({
              rulesClient,
              defaultOutputIndex: siemClient.getSignalsIndex(),
              existingRule: migratedRule,
              ruleUpdate: payloadRule,
            });
            if (rule != null) {
              const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);
              return transformValidateBulkError(rule.id, rule, ruleExecutionSummary);
            } else {
              return getIdBulkError({ id: payloadRule.id, ruleId: payloadRule.rule_id });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      const [validated, errors] = validate(rules, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
