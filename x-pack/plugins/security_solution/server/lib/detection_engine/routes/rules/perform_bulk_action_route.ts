/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { BulkAction } from '../../../../../common/detection_engine/schemas/common/schemas';
import { performBulkActionSchema } from '../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { SetupPlugins } from '../../../../plugin';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildRouteValidation } from '../../../../utils/build_validation/route_validation';
import { buildMlAuthz } from '../../../machine_learning/authz';
import { throwHttpError } from '../../../machine_learning/validation';
import { deleteRules } from '../../rules/delete_rules';
import { duplicateRule } from '../../rules/duplicate_rule';
import { enableRule } from '../../rules/enable_rule';
import { findRules } from '../../rules/find_rules';
import { getExportByObjectIds } from '../../rules/get_export_by_object_ids';
import { updateRulesNotifications } from '../../rules/update_rules_notifications';
import { getRuleActionsSavedObject } from '../../rule_actions/get_rule_actions_saved_object';
import { ruleStatusSavedObjectsClientFactory } from '../../signals/rule_status_saved_objects_client';
import { buildSiemResponse } from '../utils';

const BULK_ACTION_RULES_LIMIT = 10000;

export const performBulkActionRoute = (
  router: SecuritySolutionPluginRouter,
  ml: SetupPlugins['ml']
) => {
  router.post(
    {
      path: DETECTION_ENGINE_RULES_BULK_ACTION,
      validate: {
        body: buildRouteValidation<typeof performBulkActionSchema>(performBulkActionSchema),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const { body } = request;
      const siemResponse = buildSiemResponse(response);

      try {
        const alertsClient = context.alerting?.getAlertsClient();
        const savedObjectsClient = context.core.savedObjects.client;
        const ruleStatusClient = ruleStatusSavedObjectsClientFactory(savedObjectsClient);

        const mlAuthz = buildMlAuthz({
          license: context.licensing.license,
          ml,
          request,
          savedObjectsClient,
        });

        if (!alertsClient) {
          return siemResponse.error({ statusCode: 404 });
        }

        const rules = await findRules({
          alertsClient,
          perPage: BULK_ACTION_RULES_LIMIT,
          filter: body.query !== '' ? body.query : undefined,
          page: undefined,
          sortField: undefined,
          sortOrder: undefined,
          fields: undefined,
        });

        if (rules.total > BULK_ACTION_RULES_LIMIT) {
          return siemResponse.error({
            body: `More than ${BULK_ACTION_RULES_LIMIT} rules matched the filter query. Try to narrow it down.`,
            statusCode: 400,
          });
        }

        switch (body.action) {
          case BulkAction.enable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (!rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await enableRule({ rule, alertsClient, savedObjectsClient });
                }
              })
            );
            break;
          case BulkAction.disable:
            await Promise.all(
              rules.data.map(async (rule) => {
                if (rule.enabled) {
                  throwHttpError(await mlAuthz.validateRuleType(rule.params.type));
                  await alertsClient.disable({ id: rule.id });
                }
              })
            );
            break;
          case BulkAction.delete:
            await Promise.all(
              rules.data.map(async (rule) => {
                const ruleStatuses = await ruleStatusClient.find({
                  perPage: 6,
                  search: rule.id,
                  searchFields: ['alertId'],
                });
                await deleteRules({
                  alertsClient,
                  savedObjectsClient,
                  ruleStatusClient,
                  ruleStatuses,
                  id: rule.id,
                });
              })
            );
            break;
          case BulkAction.duplicate:
            await Promise.all(
              rules.data.map(async (rule) => {
                throwHttpError(await mlAuthz.validateRuleType(rule.params.type));

                const createdRule = await alertsClient.create({
                  data: duplicateRule(rule),
                });

                const ruleActions = await getRuleActionsSavedObject({
                  savedObjectsClient,
                  ruleAlertId: rule.id,
                });

                await updateRulesNotifications({
                  ruleAlertId: createdRule.id,
                  alertsClient,
                  savedObjectsClient,
                  enabled: createdRule.enabled,
                  actions: ruleActions?.actions || [],
                  throttle: ruleActions?.alertThrottle,
                  name: createdRule.name,
                });
              })
            );
            break;
          case BulkAction.export:
            const exported = await getExportByObjectIds(
              alertsClient,
              rules.data.map(({ params }) => ({ rule_id: params.ruleId }))
            );

            const responseBody = `${exported.rulesNdjson}${exported.exportDetails}`;

            return response.ok({
              headers: {
                'Content-Disposition': `attachment; filename="rules_export.ndjson"`,
                'Content-Type': 'application/ndjson',
              },
              body: responseBody,
            });
        }

        return response.ok({ body: { success: true, rules_count: rules.data.length } });
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
