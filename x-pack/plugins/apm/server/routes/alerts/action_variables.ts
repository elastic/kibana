/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const apmActionVariables = {
  serviceName: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.serviceName',
      { defaultMessage: 'The service the alert is created for' }
    ),
    name: 'serviceName' as const,
  },
  transactionType: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.transactionType',
      { defaultMessage: 'The transaction type the alert is created for' }
    ),
    name: 'transactionType' as const,
  },
  environment: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.environment',
      { defaultMessage: 'The transaction type the alert is created for' }
    ),
    name: 'environment' as const,
  },
  threshold: {
    description: i18n.translate('xpack.apm.alerts.action_variables.threshold', {
      defaultMessage:
        'Any trigger value above this value will cause the alert to fire',
    }),
    name: 'threshold' as const,
  },
  triggerValue: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.triggerValue',
      {
        defaultMessage:
          'The value that breached the threshold and triggered the alert',
      }
    ),
    name: 'triggerValue' as const,
  },
  interval: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.intervalSize',
      {
        defaultMessage:
          'The length and unit of the time period where the alert conditions were met',
      }
    ),
    name: 'interval' as const,
  },
  reason: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.reasonMessage',
      {
        defaultMessage: 'A concise description of the reason for the alert',
      }
    ),
    name: 'reason' as const,
  },
  viewInAppUrl: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.viewInAppUrl',
      {
        defaultMessage:
          'Link to the view or feature within Elastic that can be used to investigate the alert and its context further',
      }
    ),
    name: 'viewInAppUrl' as const,
  },
};
