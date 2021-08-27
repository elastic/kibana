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
 * Given a list of rule ids, return the current status and
 * last five errors for each associated rule.
 *
 * @param router
 * @returns RuleStatusResponse
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
        const [statusesById, failingRules] = await Promise.all([
          ruleStatusClient.findBulk({
            ruleIds: ids,
            logsCount: 6,
            spaceId: context.securitySolution.getSpaceId(),
          }),
          getFailingRules(ids, rulesClient),
        ]);

        const statuses = ids.reduce((acc, id) => {
          const lastFiveErrorsForId = statusesById[id];

          if (lastFiveErrorsForId == null || lastFiveErrorsForId.length === 0) {
            return acc;
          }

          const failingRule = failingRules[id];

          if (failingRule != null) {
            const currentStatus = mergeAlertWithSidecarStatus(failingRule, lastFiveErrorsForId[0]);
            const updatedLastFiveErrorsSO = [currentStatus, ...lastFiveErrorsForId.slice(1)];
            return mergeStatuses(id, updatedLastFiveErrorsSO, acc);
          }
          return mergeStatuses(id, [...lastFiveErrorsForId], acc);
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
