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
  ALERT_ACTION_TYPE_LOG,
} from '../../../../../common/constants';
import { handleError } from '../../../../lib/errors';
// import { fetchDefaultEmailAddress } from '../../../../lib/alerts/fetch_default_email_address';

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
      const { emailAddress, emailAction } = req.payload;
      const alertsClient = await req.getAlertsClient();
      const actionsClient = await req.getActionsClient();

      const types = await req.getActionTypeRegistry();
      const emailType = types.find(type => type.id === ALERT_ACTION_TYPE_EMAIL);

      try {
        let emailActionId = req.payload.emailActionId;

        // Email requires gold
        if (emailType && emailType.enabledInLicense) {
          // If an email address is provided, store it since we only allow a single
          // email to function across all Stack Monitoring alerts
          if (emailAddress) {
            await req
              .getUiSettingsService()
              .set(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS, emailAddress);
          }
          /*else {
            const storedEmailAddress = await fetchDefaultEmailAddress(req.getUiSettingsService());
            if (!storedEmailAddress) {
              return res.badRequest({
                body:
                  'No email provided and no stored email to use. Please provide one in the request.',
              });
            }
          }*/

          // if (!emailActionId && !emailAction) {
          //   return res.badRequest({ body: 'No email action provided.' });
          // }

          if (!emailActionId && emailAction) {
            const action = await actionsClient.create({ action: emailAction });
            emailActionId = action.id;
          } else if (emailActionId) {
            try {
              await actionsClient.get({ id: emailActionId });
            } catch (err) {
              if (err.output.statusCode === 404) {
                return res.badRequest({ body: 'Provided emailActionId is not valid.' });
              }
              throw err;
            }
          }
        }

        const serverLogAction = await actionsClient.create({
          action: {
            actionTypeId: ALERT_ACTION_TYPE_LOG,
          },
        });

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

          const actions = [
            {
              group: 'default',
              id: serverLogAction.id,
              params: {
                message: '{{context.log_message}}',
              },
            },
          ];

          if (emailActionId) {
            actions.push({
              group: 'default',
              id: emailActionId,
              params: {
                subject: '{{context.email_subject}}',
                message: `{{context.email_message}}`,
                to: ['{{context.email_to}}'],
              },
            });
          }

          const result = await alertsClient.create({
            data: {
              enabled: true,
              name: type,
              alertTypeId: type,
              throttle: '10m', // default
              schedule: { interval: '1m' },
              actions,
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
