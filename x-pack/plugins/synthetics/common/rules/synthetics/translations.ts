/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const VALUE_MUST_BE_GREATER_THAN_ZERO = i18n.translate(
  'xpack.synthetics.settings.invalid.error',
  {
    defaultMessage: 'Value must be greater than 0.',
  }
);

export const VALUE_MUST_BE_AN_INTEGER = i18n.translate(
  'xpack.synthetics.settings.invalid.nanError',
  {
    defaultMessage: 'Value must be an integer.',
  }
);

export const SyntheticsMonitorStatusTranslations = {
  defaultActionMessage: i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.defaultActionMessage',
    {
      defaultMessage:
        'Monitor {monitorName} with url {monitorUrl} from {observerLocation} {statusMessage} The latest error message is {latestErrorMessage}, checked at {checkedAt}',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        statusMessage: '{{{context.statusMessage}}}',
        latestErrorMessage: '{{{context.latestErrorMessage}}}',
        observerLocation: '{{context.observerLocation}}',
        checkedAt: '{{context.checkedAt}}',
      },
    }
  ),
  defaultSubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.defaultSubjectMessage',
    {
      defaultMessage: 'Monitor {monitorName} with url {monitorUrl} is down',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
      },
    }
  ),
  defaultRecoveryMessage: i18n.translate(
    'xpack.synthetics.alerts.monitorStatus.defaultRecoveryMessage',
    {
      defaultMessage:
        'Alert for monitor {monitorName} with url {monitorUrl} from {observerLocation} has recovered {recoveryReason}',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        observerLocation: '{{context.observerLocation}}',
        recoveryReason: '{{context.recoveryReason}}',
      },
    }
  ),
  name: i18n.translate('xpack.synthetics.alerts.monitorStatus.clientName', {
    defaultMessage: 'Uptime monitor status',
  }),
  description: i18n.translate('xpack.synthetics.alerts.monitorStatus.description', {
    defaultMessage: 'Alert when a monitor is down or an availability threshold is breached.',
  }),
};
