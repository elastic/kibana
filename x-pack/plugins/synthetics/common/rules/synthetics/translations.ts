/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SyntheticsMonitorStatusTranslations = {
  defaultActionMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultActionMessage',
    {
      defaultMessage:
        'The monitor {monitorName} checking {monitorUrl} from {locationName} last ran at {checkedAt} and is {status}. The last error received is: {lastErrorMessage}.',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        status: '{{{context.status}}}',
        lastErrorMessage: '{{{context.lastErrorMessage}}}',
        locationName: '{{context.locationName}}',
        checkedAt: '{{context.checkedAt}}',
      },
    }
  ),
  defaultSubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultSubjectMessage',
    {
      defaultMessage: 'The monitor {monitorName} checking {monitorUrl} is down.',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
      },
    }
  ),
  defaultRecoveryMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultRecoveryMessage',
    {
      defaultMessage:
        'The alert for the monitor {monitorName} checking {monitorUrl} from {locationName} is no longer active: {recoveryReason}.',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorUrl: '{{{context.monitorUrl}}}',
        locationName: '{{context.locationName}}',
        recoveryReason: '{{context.recoveryReason}}',
      },
    }
  ),
  name: i18n.translate('xpack.synthetics.alerts.syntheticsMonitorStatus.clientName', {
    defaultMessage: 'Monitor status',
  }),
  description: i18n.translate('xpack.synthetics.alerts.syntheticsMonitorStatus.description', {
    defaultMessage: 'Alert when a monitor is down.',
  }),
};
