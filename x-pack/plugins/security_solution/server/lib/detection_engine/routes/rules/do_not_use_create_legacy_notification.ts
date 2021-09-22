/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SecuritySolutionPluginRouter } from '../../../../types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__updateOrCreateRuleActionsSavedObject } from '../../rule_actions/do_not_use_update_or_create_rule_actions_saved_object';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__readNotifications } from '../../notifications/do_not_use_read_notifications';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__RuleNotificationAlertTypeParams } from '../../notifications/do_not_use_types';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__addTags } from '../../notifications/do_not_use_add_tags';
// eslint-disable-next-line no-restricted-imports
import { __DO_NOT_USE__createNotifications } from '../../notifications/do_not_use_create_notifications';

/**
 * Given an "alert_id" and a valid "action_id" this will create a legacy notification. This is for testing
 * purposes only and should not be used for production. It is behind a route with the words "internal" and
 * "legacy" to announce its legacy and internal intent.
 * @deprecated Once we no longer have legacy notifications and "side car actions" this can be removed.
 * @param router The router
 */
export const __DO_NOT_USE__createLegacyNotificationRoute = (
  router: SecuritySolutionPluginRouter
): void => {
  router.post(
    {
      path: '/internal/api/detection/do_not_use/notifications',
      validate: {
        query: schema.object({ alert_id: schema.string() }),
        body: schema.object({
          name: schema.string(),
          interval: schema.string(),
          actions: schema.arrayOf(
            schema.object({
              id: schema.string(),
              group: schema.string(),
              params: schema.object({
                message: schema.string(),
              }),
              actionTypeId: schema.string(),
            })
          ),
        }),
      },
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const rulesClient = context.alerting.getRulesClient();
      const savedObjectsClient = context.core.savedObjects.client;
      const { alert_id: ruleAlertId } = request.query;
      const { actions, interval, name } = request.body;
      try {
        // This is to ensure it exists before continuing.
        await rulesClient.get({ id: ruleAlertId });
        const notification = await __DO_NOT_USE__readNotifications({
          rulesClient,
          id: undefined,
          ruleAlertId,
        });
        if (notification != null) {
          await rulesClient.update<__DO_NOT_USE__RuleNotificationAlertTypeParams>({
            id: notification.id,
            data: {
              tags: __DO_NOT_USE__addTags([], ruleAlertId),
              name,
              schedule: {
                interval,
              },
              actions,
              params: {
                ruleAlertId,
              },
              throttle: null,
              notifyWhen: null,
            },
          });
        } else {
          await __DO_NOT_USE__createNotifications({
            rulesClient,
            actions: [],
            enabled: true,
            ruleAlertId,
            interval,
            name,
          });
        }
        await __DO_NOT_USE__updateOrCreateRuleActionsSavedObject({
          ruleAlertId,
          savedObjectsClient,
          actions,
          throttle: interval,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown';
        return response.badRequest({ body: message });
      }
      return response.ok({
        body: {
          ok: 'acknowledged',
        },
      });
    }
  );
};
