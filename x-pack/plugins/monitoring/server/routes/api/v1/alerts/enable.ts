/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import {
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
  ALERT_ACTION_TYPE_EMAIL,
} from '../../../../../common/constants';
// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { AlertsFactory } from '../../../../alerts';
import { RouteDependencies } from '../../../../types';
// import { fetchDefaultEmailAddress } from '../../../../lib/alerts/fetch_default_email_address';

export function enableAlertsRoute(server: any, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alerts/enable',
      options: { tags: ['access:monitoring'] },
      validate: {
        body: schema.object({
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
    async (context, request, response) => {
      try {
        const { emailAddress, emailAction } = request.body;
        const alertsClient = context.alerting?.getAlertsClient();
        const actionsClient = context.actions?.getActionsClient();
        const types = context.actions?.listTypes();
        if (!alertsClient || !actionsClient || !types) {
          return response.notFound();
        }

        const emailType = types?.find(type => type.id === ALERT_ACTION_TYPE_EMAIL);
        let emailActionId = request.body.emailActionId;

        // Email requires gold
        if (emailType && emailType.enabledInLicense) {
          // If an email address is provided, store it since we only allow a single
          // email to function across all Stack Monitoring alerts
          if (emailAddress) {
            await context.core.uiSettings.client.set(
              MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
              emailAddress
            );
          }
          /* else {
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
                return response.badRequest({ body: 'Provided emailActionId is not valid.' });
              }
              throw err;
            }
          }
        }

        const alerts = AlertsFactory.getAll().filter(a => a.isEnabled());
        const createdAlerts = await Promise.all(
          alerts.map(async alert => {
            return await alert.createIfDoesNotExist(alertsClient, actionsClient, []);
          })
        );
        return response.ok({ body: createdAlerts });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
