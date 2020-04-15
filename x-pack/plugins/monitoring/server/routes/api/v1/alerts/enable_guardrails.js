/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import {
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
  ALERT_GUARD_RAIL_TYPES,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../../../../common/constants';
import { handleError } from '../../../../lib/errors';
import { fetchDefaultEmailAddress } from '../../../../lib/alerts/fetch_default_email_address';

export function createEnableGuardRailsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/enable_guardrails',
    options: { tags: ['access:monitoring'] },
    config: {
      validate: {
        payload: schema.object({
          emailAddress: schema.maybe(schema.string()),
          emailActionId: schema.maybe(schema.string()),
          emailAction: schema.maybe(
            schema.object({
              name: schema.string(),
              actionTypeId: schema.string({ defaultValue: ALERT_ACTION_TYPE_EMAIL }),
              config: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
              secrets: schema.recordOf(schema.string(), schema.any(), { defaultValue: {} }),
            })
          ),
        }),
      },
    },
    async handler(req, res) {
      const { emailAddress, emailActionId, emailAction } = req.payload;
      const alertsClient = await req.getAlertsClient();
      const actionsClient = await req.getActionsClient();

      try {
        // If an email address is provided, store it since we only allow a single
        // email to function across all Stack Monitoring alerts
        if (emailAddress) {
          await req
            .getUiSettingsService()
            .set(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS, emailAddress);
        } else {
          const storedEmailAddress = await fetchDefaultEmailAddress(req.getUiSettingsService());
          if (!storedEmailAddress) {
            return res.badRequest({
              body:
                'No email provided and no stored email to use. Please provide one in the request.',
            });
          }
        }

        if (!emailActionId && !emailAction) {
          return res.badRequest({ body: 'No email action provided.' });
        }

        let actionId = emailActionId;
        if (!emailActionId && emailAction) {
          const action = await actionsClient.create({ action: emailAction });
          actionId = action.id;
        } else {
          try {
            await actionsClient.get({ id: actionId });
          } catch (err) {
            if (err.output.statusCode === 404) {
              return res.badRequest({ body: 'Provided emailActionId is not valid.' });
            }
            throw err;
          }
        }

        const createdAlerts = [];
        for (const type of ALERT_GUARD_RAIL_TYPES) {
          // Does this type exist?
          const existingAlert = await alertsClient.find({
            options: {
              search: type,
            },
          });
          if (existingAlert.total === 1) {
            req.logger.debug('Skipping alert because it exists');
            continue;
          }

          const result = await alertsClient.create({
            data: {
              enabled: true,
              alertTypeId: type,
              schedule: { interval: '10s' },
              actions: [
                {
                  group: 'default',
                  id: actionId,
                  params: {
                    subject: '{{context.subject}}',
                    message: `{{context.message}}`,
                    to: ['{{context.to}}'],
                  },
                },
              ],
            },
          });

          createdAlerts.push(result);
        }
      } catch (err) {
        throw handleError(err, req);
      }
    },
  });
}
