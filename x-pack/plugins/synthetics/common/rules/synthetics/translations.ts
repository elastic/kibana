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
      defaultMessage: `{monitorName} {monitorType} monitor is {status} from {locationName} at {checkedAt}.\nThe error received is: "{lastErrorMessage}".\n{linkMessage}`,
      values: {
        monitorName: '{{context.monitorName}}',
        monitorType: '{{context.monitorType}}',
        status: '{{{context.status}}}',
        lastErrorMessage: '{{{context.lastErrorMessage}}}',
        locationName: '{{context.locationName}}',
        checkedAt: '{{context.checkedAt}}',
        linkMessage: '{{{context.linkMessage}}}',
      },
    }
  ),
  defaultSubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultSubjectMessage',
    {
      defaultMessage: '{monitorName} ({locationName}) is Down - Elastic Synthetics',
      values: {
        monitorName: '{{context.monitorName}}',
        locationName: '{{context.locationName}}',
      },
    }
  ),
  defaultRecoverySubjectMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultRecoverySubjectMessage',
    {
      defaultMessage: '{monitorName} ({locationName}) {recoveryStatus} - Elastic Synthetics',
      values: {
        recoveryStatus: '{{context.recoveryStatus}}',
        locationName: '{{context.locationName}}',
        monitorName: '{{context.monitorName}}',
      },
    }
  ),
  defaultRecoveryMessage: i18n.translate(
    'xpack.synthetics.alerts.syntheticsMonitorStatus.defaultRecoveryMessage',
    {
      defaultMessage:
        'The alert for {monitorName} ({locationName}) {monitorType} monitor is no longer active: {recoveryReason}.\nThe latest error received was: "{lastErrorMessage}".\n{linkMessage}',
      values: {
        monitorName: '{{context.monitorName}}',
        monitorType: '{{context.monitorType}}',
        locationName: '{{context.locationName}}',
        lastErrorMessage: '{{{context.lastErrorMessage}}}',
        recoveryReason: '{{context.recoveryReason}}',
        linkMessage: '{{{context.linkMessage}}}',
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
