/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { RuleStatusResponse, IRuleStatusAttributes } from '../../rules/types';
import { transformError, convertToSnakeCase, buildSiemResponse } from '../utils';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import {
  findRulesStatusesSchema,
  FindRulesStatusesSchemaDecoded,
} from '../../../../../common/detection_engine/schemas/request/find_rule_statuses_schema';
import { findRules } from '../../rules/find_rules';
import { ruleStatusServiceFactory } from '../../signals/rule_status_service';

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
        const failingRules = await findRules({
          alertsClient,
          perPage: ids.length,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          filter: `alert.attributes.executionStatus.status: "error" AND (${ids
            .map((id) => `alert.attributes.id:${id}`)
            .join(' or ')})`,
          fields: ['executionStatus'],
        });

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);

        await Promise.all(
          failingRules.data.map(async (rule) => {
            const ruleStatusService = await ruleStatusServiceFactory({
              alertId: rule.id,
              ruleStatusClient,
            });
            return ruleStatusService.error(
              `Reason: ${rule.executionStatus.error?.reason} Message: ${rule.executionStatus.error?.message}`
            );
          })
        );

        const statuses = await ids.reduce<Promise<RuleStatusResponse | {}>>(async (acc, id) => {
          const accumulated = await acc;

          const lastFiveErrorsForId = await ruleStatusClient.find({
            perPage: 6,
            sortField: 'statusDate',
            sortOrder: 'desc',
            search: id,
            searchFields: ['alertId'],
          });

          // Array accessors can result in undefined but
          // this is not represented in typescript for some reason,
          // https://github.com/Microsoft/TypeScript/issues/11122
          const currentStatus = convertToSnakeCase<IRuleStatusAttributes>(
            lastFiveErrorsForId.saved_objects[0]?.attributes
          );

          const failures = lastFiveErrorsForId.saved_objects
            .slice(1)
            .map((errorItem) => convertToSnakeCase<IRuleStatusAttributes>(errorItem.attributes));
          return {
            ...accumulated,
            [id]: {
              current_status: currentStatus,
              failures,
            },
          };
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
