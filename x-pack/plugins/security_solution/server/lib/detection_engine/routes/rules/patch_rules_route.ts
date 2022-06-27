/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { patchRulesSchema } from '../../../../../common/detection_engine/schemas/request/rule_schemas';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { SetupPlugins } from '../../../../plugin';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwAuthzError } from '../../../machine_learning/validation';
import { patchRules } from '../../rules/patch_rules';
import { buildSiemResponse } from '../utils';

import { getIdError } from './utils';
import { transformValidate } from './validate';
import { readRules } from '../../rules/read_rules';
import { legacyMigrate } from '../../rules/utils';

export const patchRulesRoute = (router: SecuritySolutionPluginRouter, ml: SetupPlugins['ml']) => {
  router.patch(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        body: buildRouteValidation<typeof patchRulesSchema>(patchRulesSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      try {
        const params = request.body;
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleExecutionLog = (await context.securitySolution).getRuleExecutionLog();
        const savedObjectsClient = (await context.core).savedObjects.client;

        const mlAuthz = buildMlAuthz({
          license: (await context.licensing).license,
          ml,
          request,
          savedObjectsClient,
        });
        if (params.type) {
          // reject an unauthorized "promotion" to ML
          throwAuthzError(await mlAuthz.validateRuleType(params.type));
        }

        const existingRule = await readRules({
          rulesClient,
          ruleId: params.rule_id,
          id: params.id,
        });
        if (existingRule?.params.type) {
          // reject an unauthorized modification of an ML rule
          throwAuthzError(await mlAuthz.validateRuleType(existingRule?.params.type));
        }

        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule: existingRule,
        });

        const rule = await patchRules({
          rulesClient,
          rule: migratedRule,
          params,
        });
        if (rule != null && rule.enabled != null && rule.name != null) {
          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);

          const [validated, errors] = transformValidate(rule, ruleExecutionSummary);
          if (errors != null) {
            return siemResponse.error({ statusCode: 500, body: errors });
          } else {
            return response.ok({ body: validated ?? {} });
          }
        } else {
          const error = getIdError({ id: params.id, ruleId: params.rule_id });
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
