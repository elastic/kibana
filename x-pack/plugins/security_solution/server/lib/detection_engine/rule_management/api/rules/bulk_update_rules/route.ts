/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { validate } from '@kbn/securitysolution-io-ts-utils';

import {
  BulkUpdateRulesRequestBody,
  validateUpdateRuleProps,
  BulkCrudRulesResponse,
} from '../../../../../../../common/detection_engine/rule_management';

import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { DETECTION_ENGINE_RULES_BULK_UPDATE } from '../../../../../../../common/constants';
import type { SetupPlugins } from '../../../../../../plugin';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../../machine_learning/validation';
import { getIdBulkError } from '../../../utils/utils';
import { transformValidateBulkError } from '../../../utils/validate';
import {
  transformBulkError,
  buildSiemResponse,
  createBulkErrorObject,
} from '../../../../routes/utils';
import { updateRules } from '../../../logic/crud/update_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyMigrate } from '../../../logic/rule_actions/legacy_action_migration';
import { readRules } from '../../../logic/crud/read_rules';
import { getDeprecatedBulkEndpointHeader, logDeprecatedBulkEndpoint } from '../../deprecation';
import { validateRuleDefaultExceptionList } from '../../../logic/exceptions/validate_rule_default_exception_list';
import { validateRulesWithDuplicatedDefaultExceptionsList } from '../../../logic/exceptions/validate_rules_with_duplicated_default_exceptions_list';

/**
 * @deprecated since version 8.2.0. Use the detection_engine/rules/_bulk_action API instead
 */
export const bulkUpdateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  logger: Logger
) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_BULK_UPDATE,
      validate: {
        body: buildRouteValidation(BulkUpdateRulesRequestBody),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      logDeprecatedBulkEndpoint(logger, DETECTION_ENGINE_RULES_BULK_UPDATE);

      const siemResponse = buildSiemResponse(response);

      const ctx = await context.resolve(['core', 'securitySolution', 'alerting', 'licensing']);

      const rulesClient = ctx.alerting.getRulesClient();
      const savedObjectsClient = ctx.core.savedObjects.client;

      const mlAuthz = buildMlAuthz({
        license: ctx.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });

      const rules = await Promise.all(
        request.body.map(async (payloadRule) => {
          const idOrRuleIdOrUnknown = payloadRule.id ?? payloadRule.rule_id ?? '(unknown id)';
          try {
            const validationErrors = validateUpdateRuleProps(payloadRule);
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

            validateRulesWithDuplicatedDefaultExceptionsList({
              allRules: request.body,
              exceptionsList: payloadRule.exceptions_list,
              ruleId: idOrRuleIdOrUnknown,
            });
            await validateRuleDefaultExceptionList({
              exceptionsList: payloadRule.exceptions_list,
              rulesClient,
              ruleRuleId: payloadRule.rule_id,
              ruleId: payloadRule.id,
            });

            const migratedRule = await legacyMigrate({
              rulesClient,
              savedObjectsClient,
              rule: existingRule,
            });

            const rule = await updateRules({
              rulesClient,
              existingRule: migratedRule,
              ruleUpdate: payloadRule,
            });
            if (rule != null) {
              return transformValidateBulkError(rule.id, rule);
            } else {
              return getIdBulkError({ id: payloadRule.id, ruleId: payloadRule.rule_id });
            }
          } catch (err) {
            return transformBulkError(idOrRuleIdOrUnknown, err);
          }
        })
      );

      const [validated, errors] = validate(rules, BulkCrudRulesResponse);
      if (errors != null) {
        return siemResponse.error({
          statusCode: 500,
          body: errors,
          headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_UPDATE),
        });
      } else {
        return response.ok({
          body: validated ?? {},
          headers: getDeprecatedBulkEndpointHeader(DETECTION_ENGINE_RULES_BULK_UPDATE),
        });
      }
    }
  );
};
