/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validate } from '../../../../../common/validate';
import { createRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/create_rules_type_dependents';
import { createRulesBulkSchema } from '../../../../../common/detection_engine/schemas/request/create_rules_bulk_schema';
import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { readRules } from '../../rules/read_rules';
import { getDuplicates } from './utils';
import { transformValidateBulkError } from './validate';
import { getIndexExists } from '../../index/get_index_exists';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';

import { transformBulkError, createBulkErrorObject, buildSiemResponse } from '../utils';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { convertCreateAPIToInternalSchema } from '../../schemas/rule_converters';

export const createRulesBulkRoute = (router: IRouter, ml: SetupPlugins['ml']) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bulk_create`,
      validate: {
        body: buildRouteValidation(createRulesBulkSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const alertsClient = context.alerting?.getAlertsClient();
      const clusterClient = context.core.elasticsearch.legacy.client;
      const savedObjectsClient = context.core.savedObjects.client;
      const siemClient = context.securitySolution?.getAppClient();

      if (!siemClient || !alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const mlAuthz = buildMlAuthz({
        license: context.licensing.license,
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
                alertsClient,
                ruleId: payloadRule.rule_id,
                id: undefined,
              });
              if (rule != null) {
                return createBulkErrorObject({
                  ruleId: payloadRule.rule_id,
                  statusCode: 409,
                  message: `rule_id: "${payloadRule.rule_id}" already exists`,
                });
              }
            }
            const internalRule = convertCreateAPIToInternalSchema(payloadRule, siemClient);
            try {
              const validationErrors = createRuleValidateTypeDependents(payloadRule);
              if (validationErrors.length) {
                return createBulkErrorObject({
                  ruleId: internalRule.params.ruleId,
                  statusCode: 400,
                  message: validationErrors.join(),
                });
              }

              throwHttpError(await mlAuthz.validateRuleType(internalRule.params.type));
              const finalIndex = internalRule.params.outputIndex;
              const indexExists = await getIndexExists(clusterClient.callAsCurrentUser, finalIndex);
              if (!indexExists) {
                return createBulkErrorObject({
                  ruleId: internalRule.params.ruleId,
                  statusCode: 400,
                  message: `To create a rule, the index must exist first. Index ${finalIndex} does not exist`,
                });
              }

              const createdRule = await alertsClient.create({
                data: internalRule,
              });

              const ruleActions = await updateRulesNotifications({
                ruleAlertId: createdRule.id,
                alertsClient,
                savedObjectsClient,
                enabled: createdRule.enabled,
                actions: payloadRule.actions,
                throttle: payloadRule.throttle ?? null,
                name: createdRule.name,
              });

              return transformValidateBulkError(
                internalRule.params.ruleId,
                createdRule,
                ruleActions
              );
            } catch (err) {
              return transformBulkError(internalRule.params.ruleId, err);
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
      const [validated, errors] = validate(rulesBulk, rulesBulkSchema);
      if (errors != null) {
        return siemResponse.error({ statusCode: 500, body: errors });
      } else {
        return response.ok({ body: validated ?? {} });
      }
    }
  );
};
