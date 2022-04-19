/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { queryRuleValidateTypeDependents } from '../../../../../common/detection_engine/schemas/request/query_rules_type_dependents';
import {
  queryRulesSchema,
  QueryRulesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/query_rules_schema';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { deleteRules } from '../../rules/delete_rules';
import { getIdError, transform } from './utils';
import { buildSiemResponse } from '../utils';

import { readRules } from '../../rules/read_rules';
import { legacyMigrate } from '../../rules/utils';

export const deleteRulesRoute = (
  router: SecuritySolutionPluginRouter,
  isRuleRegistryEnabled: boolean
) => {
  router.delete(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: {
        query: buildRouteValidation<typeof queryRulesSchema, QueryRulesSchemaDecoded>(
          queryRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);
      const validationErrors = queryRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const { id, rule_id: ruleId } = request.query;

        const rulesClient = context.alerting.getRulesClient();
        const ruleExecutionLog = context.securitySolution.getRuleExecutionLog();
        const savedObjectsClient = context.core.savedObjects.client;

        const rule = await readRules({ isRuleRegistryEnabled, rulesClient, id, ruleId });
        const migratedRule = await legacyMigrate({
          rulesClient,
          savedObjectsClient,
          rule,
        });

        if (!migratedRule) {
          const error = getIdError({ id, ruleId });
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }

        const ruleExecutionSummary = await ruleExecutionLog.getExecutionSummary(migratedRule.id);

        await deleteRules({
          ruleId: migratedRule.id,
          rulesClient,
          ruleExecutionLog,
        });

        const transformed = transform(migratedRule, ruleExecutionSummary, isRuleRegistryEnabled);
        if (transformed == null) {
          return siemResponse.error({ statusCode: 500, body: 'failed to transform alert' });
        } else {
          return response.ok({ body: transformed ?? {} });
        }
      } catch (err) {
        console.log(JSON.stringify(err));
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    }
  );
};
