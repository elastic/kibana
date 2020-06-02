/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { rulesBulkSchema } from '../../../../../common/detection_engine/schemas/response/rules_bulk_schema';
import { IRouter, RouteConfig, RequestHandler } from '../../../../../../../../src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { queryRulesBulkSchema } from '../schemas/query_rules_bulk_schema';
import { getIdBulkError } from './utils';
import { transformValidateBulkError, validate } from './validate';
import { transformBulkError, buildRouteValidation, buildSiemResponse } from '../utils';
import { DeleteRulesRequestParams } from '../../rules/types';
import { deleteRules } from '../../rules/delete_rules';
import { deleteNotifications } from '../../notifications/delete_notifications';
import { deleteRuleActionsSavedObject } from '../../rule_actions/delete_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';

type Config = RouteConfig<unknown, unknown, DeleteRulesRequestParams, 'delete' | 'post'>;
type Handler = RequestHandler<unknown, unknown, DeleteRulesRequestParams, 'delete' | 'post'>;

export const deleteRulesBulkRoute = (router: IRouter) => {
  const config: Config = {
    validate: {
      body: buildRouteValidation<DeleteRulesRequestParams>(queryRulesBulkSchema),
    },
    path: `${DETECTION_ENGINE_RULES_URL}/_bulk_delete`,
    options: {
      tags: ['access:siem'],
    },
  };
  const handler: Handler = async (context, request, response) => {
    const siemResponse = buildSiemResponse(response);

    const alertsClient = context.alerting?.getAlertsClient();
    const savedObjectsClient = context.core.savedObjects.client;

    if (!alertsClient) {
      return siemResponse.error({ statusCode: 404 });
    }

    const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);

    const rules = await Promise.all(
      request.body.map(async (payloadRule) => {
        const { id, rule_id: ruleId } = payloadRule;
        const idOrRuleIdOrUnknown = id ?? ruleId ?? '(unknown id)';
        try {
          const rule = await deleteRules({
            alertsClient,
            id,
            ruleId,
          });
          if (rule != null) {
            await deleteNotifications({ alertsClient, ruleAlertId: rule.id });
            await deleteRuleActionsSavedObject({
              ruleAlertId: rule.id,
              savedObjectsClient,
            });
            const ruleStatuses = await ruleStatusClient.find({
              perPage: 6,
              search: rule.id,
              searchFields: ['alertId'],
            });
            ruleStatuses.saved_objects.forEach(async (obj) => ruleStatusClient.delete(obj.id));
            return transformValidateBulkError(idOrRuleIdOrUnknown, rule, undefined, ruleStatuses);
          } else {
            return getIdBulkError({ id, ruleId });
          }
        } catch (err) {
          return transformBulkError(idOrRuleIdOrUnknown, err);
        }
      })
    );
    const [validated, errors] = validate(rules, rulesBulkSchema);
    if (errors != null) {
      return siemResponse.error({ statusCode: 500, body: errors });
    } else {
      return response.ok({ body: validated ?? {} });
    }
  };

  router.delete(config, handler);
  router.post(config, handler);
};
