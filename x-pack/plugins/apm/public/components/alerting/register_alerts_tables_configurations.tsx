/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { AlertsTableConfigurationRegistryContract } from '@kbn/triggers-actions-ui-plugin/public';
import {
  AlertConsumers,
  TIMESTAMP,
  EVENT_ACTION,
  ALERT_DURATION,
  ALERT_REASON,
} from '@kbn/rule-data-utils';

export const registerAlertsTableConfiguration = (
  registry: AlertsTableConfigurationRegistryContract
) => {
  if (registry.has(AlertConsumers.APM)) {
    return;
  }
  registry.register({
    id: AlertConsumers.APM,
    columns: [
      {
        id: EVENT_ACTION,
        displayAsText: i18n.translate(
          'xpack.apm.alerts.alertsColumn.alertStatus',
          {
            defaultMessage: 'Alert Status',
          }
        ),
        initialWidth: 150,
      },
      {
        id: TIMESTAMP,
        displayAsText: i18n.translate(
          'xpack.apm.alerts.alertsColumn.timestamp',
          {
            defaultMessage: 'Last updated',
          }
        ),
        initialWidth: 250,
      },
      {
        id: ALERT_DURATION,
        displayAsText: i18n.translate(
          'xpack.apm.alerts.alertsColumn.duration',
          {
            defaultMessage: 'Duration',
          }
        ),
        initialWidth: 150,
      },
      {
        id: ALERT_REASON,
        displayAsText: i18n.translate('xpack.apm.alerts.alertsColumn.reason', {
          defaultMessage: 'Reason',
        }),
      },
    ],
  });
};
