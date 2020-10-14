/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IRouter } from '../../../../../../../../src/core/server';
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
export const findRulesStatusesRoute = (router: IRouter) => {
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
        const failingRules = await getFailingRules(ids, alertsClient);

        const statuses = await ids.reduce(async (acc, id) => {
          const accumulated = await acc;
          const lastFiveErrorsForId = await ruleStatusClient.find({
            perPage: 6,
            sortField: 'statusDate',
            sortOrder: 'desc',
            search: id,
            searchFields: ['alertId'],
          });

          if (lastFiveErrorsForId.saved_objects.length === 0) {
            return accumulated;
          }

          const failingRule = failingRules[id];
          const lastFailureAt = lastFiveErrorsForId.saved_objects[0].attributes.lastFailureAt;

          if (
            failingRule != null &&
            (lastFailureAt == null ||
              new Date(failingRule.executionStatus.lastExecutionDate) > new Date(lastFailureAt))
          ) {
            const currentStatus = lastFiveErrorsForId.saved_objects[0];
            currentStatus.attributes.lastFailureMessage = `Reason: ${failingRule.executionStatus.error?.reason} Message: ${failingRule.executionStatus.error?.message}`;
            currentStatus.attributes.lastFailureAt = failingRule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.statusDate = failingRule.executionStatus.lastExecutionDate.toISOString();
            currentStatus.attributes.status = 'failed';
            const updatedLastFiveErrorsSO = [
              currentStatus,
              ...lastFiveErrorsForId.saved_objects.slice(1),
            ];

            return mergeStatuses(id, updatedLastFiveErrorsSO, accumulated);
          }
          return mergeStatuses(id, [...lastFiveErrorsForId.saved_objects], accumulated);
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
