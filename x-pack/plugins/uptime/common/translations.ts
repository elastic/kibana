/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const VALUE_MUST_BE_GREATER_THAN_ZERO = i18n.translate(
  'xpack.uptime.settings.invalid.error',
  {
    defaultMessage: 'Value must be greater than 0.',
  }
);

export const VALUE_MUST_BE_AN_INTEGER = i18n.translate('xpack.uptime.settings.invalid.nanError', {
  defaultMessage: 'Value must be an integer.',
});

export const MonitorStatusTranslations = {
  defaultActionMessage: i18n.translate('xpack.uptime.alerts.monitorStatus.defaultActionMessage', {
    defaultMessage:
      'Monitor {monitorName} with url {monitorUrl} is {statusMessage} from {observerLocation}. The latest error message is {latestErrorMessage}',
    values: {
      monitorName: '{{state.monitorName}}',
      monitorUrl: '{{{state.monitorUrl}}}',
      statusMessage: '{{state.statusMessage}}',
      latestErrorMessage: '{{{state.latestErrorMessage}}}',
      observerLocation: '{{state.observerLocation}}',
    },
  }),
  name: i18n.translate('xpack.uptime.alerts.monitorStatus.clientName', {
    defaultMessage: 'Uptime monitor status',
  }),
  description: i18n.translate('xpack.uptime.alerts.monitorStatus.description', {
    defaultMessage: 'Alert when a monitor is down or an availability threshold is breached.',
  }),
};
