/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { INTERNAL_DETECTION_ENGINE_RULE_STATUS_URL } from '../../../../../common/constants';
import { buildSiemResponse, mergeStatuses, getFailingRules } from '../utils';
import {
  findRuleStatusSchema,
  FindRuleStatusSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rule_statuses_schema';
import { mergeAlertWithSidecarStatus } from '../../schemas/rule_converters';

/**
 * Returns the current execution status and metrics + last five failed statuses of a given rule.
 * Accepts a rule id.
 *
 * NOTE: This endpoint is a raw implementation of an endpoint for reading rule execution
 * status and logs for a given rule (e.g. for use on the Rule Details page). It will be reworked.
 * See the plan in https://github.com/elastic/kibana/pull/115574
 *
 * @param router
 * @returns RuleStatusResponse containing data only for the given rule (normally it contains data for N rules).
 */
export const findRuleStatusInternalRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: INTERNAL_DETECTION_ENGINE_RULE_STATUS_URL,
      validate: {
        body: buildRouteValidation<typeof findRuleStatusSchema, FindRuleStatusSchemaDecoded>(
          findRuleStatusSchema
        ),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { ruleId } = request.body;

      const siemResponse = buildSiemResponse(response);
      const rulesClient = context.alerting?.getRulesClient();

      if (!rulesClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      try {
        const ruleStatusClient = context.securitySolution.getExecutionLogClient();
        const spaceId = context.securitySolution.getSpaceId();

        const [currentStatus, lastFailures, failingRules] = await Promise.all([
          ruleStatusClient.getCurrentStatus({ ruleId, spaceId }),
          ruleStatusClient.getLastFailures({ ruleId, spaceId }),
          getFailingRules([ruleId], rulesClient),
        ]);

        const failingRule = failingRules[ruleId];
        let statuses = {};

        if (currentStatus != null) {
          const finalCurrentStatus =
            failingRule != null
              ? mergeAlertWithSidecarStatus(failingRule, currentStatus)
              : currentStatus;

          statuses = mergeStatuses(ruleId, [finalCurrentStatus, ...lastFailures], statuses);
        }

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
