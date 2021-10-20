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
  findRulesStatusesSchema,
  FindRulesStatusesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rule_statuses_schema';
import { mergeAlertWithSidecarStatus } from '../../schemas/rule_converters';

/**
 * Given a list of rule ids, return the current status and
 * last five errors for each associated rule.
 *
 * @param router
 * @returns RuleStatusResponse
 */
export const internalFindRuleStatusRoute = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: INTERNAL_DETECTION_ENGINE_RULE_STATUS_URL,
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

      const ruleId = body.ids[0];

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
