/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import type { Logger } from '@kbn/core/server';
import { findRuleValidateTypeDependents } from '../../../../../../../common/detection_engine/rule_management/api/rules/find_rules/find_rules_type_dependents';
import type { FindRulesSchemaDecoded } from '../../../../../../../common/detection_engine/rule_management/api/rules/find_rules/find_rules_schema';
import { findRulesSchema } from '../../../../../../../common/detection_engine/rule_management/api/rules/find_rules/find_rules_schema';
import type { SecuritySolutionPluginRouter } from '../../../../../../types';
import { DETECTION_ENGINE_RULES_URL_FIND } from '../../../../../../../common/constants';
import { findRules } from '../../../logic/search/find_rules';
import { buildSiemResponse } from '../../../../routes/utils';
import { buildRouteValidation } from '../../../../../../utils/build_validation/route_validation';
import { transformFindAlerts } from '../../../utils/utils';

// eslint-disable-next-line no-restricted-imports
import { legacyGetBulkRuleActionsSavedObject } from '../../../../rule_actions_legacy';

export const findRulesRoute = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.get(
    {
      path: DETECTION_ENGINE_RULES_URL_FIND,
      validate: {
        query: buildRouteValidation<typeof findRulesSchema, FindRulesSchemaDecoded>(
          findRulesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      const validationErrors = findRuleValidateTypeDependents(request.query);
      if (validationErrors.length) {
        return siemResponse.error({ statusCode: 400, body: validationErrors });
      }

      try {
        const { query } = request;
        const ctx = await context.resolve(['core', 'securitySolution', 'alerting']);
        const rulesClient = ctx.alerting.getRulesClient();
        const ruleExecutionLog = ctx.securitySolution.getRuleExecutionLog();
        const savedObjectsClient = ctx.core.savedObjects.client;

        const rules = await findRules({
          rulesClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
          fields: query.fields,
        });

        const ruleIds = rules.data.map((rule) => rule.id);

        const [ruleExecutionSummaries, ruleActions] = await Promise.all([
          ruleExecutionLog.getExecutionSummariesBulk(ruleIds),
          legacyGetBulkRuleActionsSavedObject({ alertIds: ruleIds, savedObjectsClient, logger }),
        ]);

        const transformed = transformFindAlerts(rules, ruleExecutionSummaries, ruleActions);
        if (transformed == null) {
          return siemResponse.error({ statusCode: 500, body: 'Internal error transforming' });
        } else {
          return response.ok({ body: transformed ?? {} });
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
