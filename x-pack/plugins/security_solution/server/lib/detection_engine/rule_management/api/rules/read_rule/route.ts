/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';

import { DETECTION_ENGINE_RULES_URL } from '../../../../../../../common/constants';
import {
  QueryRuleByIds,
  validateQueryRuleByIds,
} from '../../../../../../../common/detection_engine/rule_management';

import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { buildSiemResponse } from '../../../../routes/utils';
import { getIdError, transform } from '../../../utils/utils';

import { readRules } from '../../../logic/crud/read_rules';
// eslint-disable-next-line no-restricted-imports
import { legacyGetRuleActionsSavedObject } from '../../../../rule_actions_legacy';

export const readRuleRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation(QueryRuleByIds),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = validateQueryRuleByIds(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      const { id, rule_id: ruleId } = request.query;

      try {
        const rulesClient = (await context.alerting).getRulesClient();
        const ruleExecutionLog = (await context.securitySolution).getRuleExecutionLog();
        const savedObjectsClient = (await context.core).savedObjects.client;

        const rule = await readRules({
          id,
          rulesClient,
          ruleId,
        });
        if (rule != null) {
          const legacyRuleActions = await legacyGetRuleActionsSavedObject({
            savedObjectsClient,
            ruleAlertId: rule.id,
            logger,
          });

          const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(rule.id);

          const transformed = transform(rule, ruleExecutionSummary, legacyRuleActions);
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
