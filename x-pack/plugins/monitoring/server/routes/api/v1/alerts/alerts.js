/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { isFunction } from 'lodash';
import {
  ALERT_TYPE_LICENSE_EXPIRATION,
  MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS,
} from '../../../../../common/constants';

async function createAlerts(req, alertsClient, { selectedEmailActionId }) {
  const createdAlerts = [];

  // Create alerts
  const ALERT_TYPES = {
    [ALERT_TYPE_LICENSE_EXPIRATION]: {
      schedule: { interval: '10s' },
      actions: [
        {
          group: 'default',
          id: selectedEmailActionId,
          params: {
            subject: '{{context.subject}}',
            message: `{{context.message}}`,
            to: ['{{context.to}}'],
          },
        },
      ],
    },
  };

  for (const alertTypeId of Object.keys(ALERT_TYPES)) {
    const existingAlert = await alertsClient.find({
      options: {
        search: alertTypeId,
      },
    });
    if (existingAlert.total === 1) {
      await alertsClient.delete({ id: existingAlert.data[0].id });
    }

    const result = await alertsClient.create({
      data: {
        enabled: true,
        alertTypeId,
        ...ALERT_TYPES[alertTypeId],
      },
    });
    createdAlerts.push(result);
  }

  return createdAlerts;
}

async function saveEmailAddress(emailAddress, uiSettingsService) {
  await uiSettingsService.set(MONITORING_CONFIG_ALERTING_EMAIL_ADDRESS, emailAddress);
}

export function createKibanaAlertsRoute(server) {
  server.route({
    method: 'POST',
    path: '/api/monitoring/v1/alerts',
    config: {
      validate: {
        payload: schema.object({
          selectedEmailActionId: schema.string(),
          emailAddress: schema.string(),
        }),
      },
    },
    async handler(req, headers) {
      const { emailAddress, selectedEmailActionId } = req.payload;
      const alertsClient = isFunction(req.getAlertsClient) ? req.getAlertsClient() : null;
      if (!alertsClient) {
        return headers.response().code(404);
      }

      const [alerts, emailResponse] = await Promise.all([
        createAlerts(req, alertsClient, { ...req.params, selectedEmailActionId }),
        saveEmailAddress(emailAddress, req.getUiSettingsService()),
      ]);

      return { alerts, emailResponse };
    },
  });
}
