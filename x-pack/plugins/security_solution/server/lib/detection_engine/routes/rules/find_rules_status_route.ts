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

      // build return object with ids as keys and errors as values.
      /* looks like this
        {
            "someAlertId": [{"myerrorobject": "some error value"}, etc..],
            "anotherAlertId": ...
        }
    */
      try {
        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const statuses = await body.ids.reduce<Promise<RuleStatusResponse | {}>>(
          async (acc, id) => {
            const lastFiveErrorsForId = await ruleStatusClient.find({
              perPage: 6,
              sortField: 'statusDate',
              sortOrder: 'desc',
              search: id,
              searchFields: ['alertId'],
            });
            const accumulated = await acc;

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
          },
          Promise.resolve<RuleStatusResponse>({})
        );
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
