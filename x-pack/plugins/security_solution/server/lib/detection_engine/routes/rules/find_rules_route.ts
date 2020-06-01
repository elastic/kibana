/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { findRules } from '../../rules/find_rules';
import { FindRulesRequestParams } from '../../rules/types';
import { findRulesSchema } from '../schemas/find_rules_schema';
import { transformValidateFindAlerts } from './validate';
import { buildRouteValidation, transformError, buildSiemResponse } from '../utils';
import { getRuleActionsSavedObject } from '../../rule_actions/get_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

export const findRulesRoute = (router: IRouter) => {
  router.get(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_find`,
      validate: {
        query: buildRouteValidation<FindRulesRequestParams>(findRulesSchema),
      },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const { query } = request;
        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);
        const rules = await findRules({
          alertsClient,
          perPage: query.per_page,
          page: query.page,
          sortField: query.sort_field,
          sortOrder: query.sort_order,
          filter: query.filter,
        });
        const ruleStatuses = await Promise.all(
          rules.data.map(async (rule) => {
            const results = await ruleStatusClient.find({
              perPage: 1,
              sortField: 'statusDate',
              sortOrder: 'desc',
              search: rule.id,
              searchFields: ['alertId'],
            });
            return results;
          })
        );
        const ruleActions = await Promise.all(
          rules.data.map(async (rule) => {
            const results = await getRuleActionsSavedObject({
              savedObjectsClient,
              ruleAlertId: rule.id,
            });

            return results;
          })
        );

        const [validated, errors] = transformValidateFindAlerts(rules, ruleActions, ruleStatuses);
        if (errors != null) {
          return siemResponse.error({ statusCode: 500, body: errors });
        } else {
          return response.ok({ body: validated ?? {} });
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
