/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { updateRulesSchema } from '../../../../../common/detection_engine/schemas/request';
import { updateRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/update_rules_type_dependents';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { transformValidate } from './validate';
import { updateRules } from '../../rules/update_rules';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { legacyMigrate } from '../../rules/utils';
import { readRules } from '../../rules/read_rules';

export const updateRulesRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml'],
  isRuleRegistryEnabled: boolean
) => {
  router.put(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation(updateRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = updateRuleValidateTypeDependents(request.body);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }
      try {
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
        throwHttpError(await mlAuthz.validateRuleType(request.body.type));

        const ruleStatusClient = context.securitySolution.getExecutionLogClient();

        const existingRule = await readRules({
          isRuleRegistryEnabled,
          rulesClient,
          ruleId: request.body.rule_id,
          id: request.body.id,
        });

        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule: existingRule,
        });
        const rule = await updateRules({
          defaultOutputIndex: siemClient.getSignalsIndex(),
          isRuleRegistryEnabled,
          rulesClient,
          ruleStatusClient,
          existingRule: migratedRule,
          ruleUpdate: request.body,
          spaceId: context.securitySolution.getSpaceId(),
        });

        if (rule != null) {
          const ruleStatus = await ruleStatusClient.getCurrentStatus({
            ruleId: rule.id,
            spaceId: context.securitySolution.getSpaceId(),
          });
          const [validated, errors] = transformValidate(rule, ruleStatus, isRuleRegistryEnabled);
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
