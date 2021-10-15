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
import { throwHttpError } from '../../../machine_learning/validation';
import { getIdBulkError } from './utils';
import { transformValidateBulkError } from './validate';
import { transformBulkError, buildSiemResponse, createBulkErrorObject } from '../utils';
import { updateRules } from '../../rules/update_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleActionsSavedObjectType } from '../../rule_actions/legacy_saved_object_mappings';

export const updateRulesBulkRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
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

      const rulesClient = context.alerting?.getRulesClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
        ml,
        request,
        savedObjectsClient,
      });

      const ruleStatusClient = context.securitySolution.getExecutionLogClient();
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

            throwHttpError(await mlAuthz.validateRuleType(payloadRule.type));

            const rule = await updateRules({
              spaceId: context.securitySolution.getSpaceId(),
              rulesClient,
              ruleStatusClient,
              savedObjectsClient,
              defaultOutputIndex: siemClient.getSignalsIndex(),
              ruleUpdate: payloadRule,
              isRuleRegistryEnabled,
            });

            if (rule != null) {
              const siemNotification = await rulesClient.find({
                options: {
                  hasReference: {
                    type: 'alert',
                    id: rule.id,
                  },
                },
              });

              await rulesClient.delete({ id: siemNotification.data[0].id });

              const thing2 = await savedObjectsClient.find({
                type: legacyRuleActionsSavedObjectType,
              });

              if (rule?.actions != null) {
                rule.actions = siemNotification.data[0].actions;
                rule.throttle = siemNotification.data[0].schedule.interval;
                rule.notifyWhen = 'onThrottleInterval';
              }
            }
            if (rule != null) {
              const ruleStatuses = await ruleStatusClient.find({
                logsCount: 1,
                ruleId: rule.id,
                spaceId: context.securitySolution.getSpaceId(),
              });
              return transformValidateBulkError(rule.id, rule, ruleStatuses, isRuleRegistryEnabled);
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
