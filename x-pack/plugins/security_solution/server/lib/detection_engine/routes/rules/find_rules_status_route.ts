/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { RuleStatusResponse } from '../../rules/types';
import { transformError, buildSiemResponse, mergeStatuses, getFailingRules } from '../utils';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import {
  findRulesStatusesSchema,
  FindRulesStatusesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rule_statuses_schema';

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
      const alertsClient = context.alerting?.getAlertsClient();
      const savedObjectsClient = context.core.savedObjects.client;

      if (!alertsClient) {
        return siemResponse.error({ statusCode: 404 });
      }

      const ids = body.ids;
      try {
        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        // console.log(`${new Date().toISOString()} finding statuses bulk`);
        const statusesById = await ruleStatusClient.findBulk(ids);
        const failingRules = await getFailingRules(ids, alertsClient);

        const statuses = await ids.reduce(async (acc, id) => {
          const accumulated = await acc;
          const lastFiveErrorsForId = statusesById[id];

          if (lastFiveErrorsForId == null || lastFiveErrorsForId.length === 0) {
            return accumulated;
          }

          const failingRule = failingRules[id];
          const lastFailureAt = lastFiveErrorsForId[0].lastFailureAt;

          if (
            failingRule != null &&
            (lastFailureAt == null ||
              new Date(failingRule.executionStatus.lastExecutionDate) > new Date(lastFailureAt))
          ) {
            const currentStatus = lastFiveErrorsForId[0];
            currentStatus.attributes.lastFailureMessage = `Reason: ${failingRule.executionStatus.error?.reason} Message: ${failingRule.executionStatus.error?.message}`;
            currentStatus.attributes.lastFailureAt = failingRule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.statusDate = failingRule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.status = 'failed';
            const updatedLastFiveErrorsSO = [currentStatus, ...lastFiveErrorsForId.slice(1)];

            return mergeStatuses(id, updatedLastFiveErrorsSO, accumulated);
          }
          return mergeStatuses(id, [...lastFiveErrorsForId], accumulated);
        }, Promise.resolve<RuleStatusResponse>({}));

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
