/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { buildSiemResponse, mergeStatuses, getFailingRules } from '../utils';
import {
  findRulesStatusesSchema,
  FindRulesStatusesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rule_statuses_schema';
import { mergeAlertWithSidecarStatus } from '../../schemas/rule_converters';

/**
 * Returns the current execution status and metrics for N rules.
 * Accepts an array of rule ids.
 *
 * NOTE: This endpoint is used on the Rule Management page and will be reworked.
 * See the plan in https://github.com/elastic/kibana/pull/115574
 *
 * @param router
 * @returns RuleStatusResponse containing data for N requested rules.
 * RuleStatusResponse[ruleId].failures is always an empty array, because
 * we don't need failure history of every rule when we render tables with rules.
 */
export const findRulesStatusesRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find_statuses`,
      validate: {
        body: buildRouteValidation<typeof findRulesStatusesSchema, FindRulesStatusesSchemaDecoded>(
          findRulesStatusesSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);
      const rulesClient = context.alerting?.getRulesClient();

      if (!rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const ids = body.ids;
      try {
        const ruleStatusClient = context.securitySolution.getExecutionLogClient();
        const [currentStatusesByRuleId, failingRules] = await Promise.all([
          ruleStatusClient.getCurrentStatusBulk({
            ruleIds: ids,
            spaceId: context.securitySolution.getSpaceId(),
          }),
          getFailingRules(ids, rulesClient),
        ]);

        const statuses = ids.reduce((acc, id) => {
          const currentStatus = currentStatusesByRuleId[id];
          const failingRule = failingRules[id];

          if (currentStatus == null) {
            return acc;
          }

          const finalCurrentStatus =
            failingRule != null
              ? mergeAlertWithSidecarStatus(failingRule, currentStatus)
              : currentStatus;

          return mergeStatuses(id, [finalCurrentStatus], acc);
        }, {});

        return response.ok({ body: statuses });
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
