/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const apmActionVariables = {
  serviceName: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.serviceName',
      { defaultMessage: 'The service the alert is created for' }
    ),
    name: 'serviceName',
  },
  transactionType: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.transactionType',
      { defaultMessage: 'The transaction type the alert is created for' }
    ),
    name: 'transactionType',
  },
  environment: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.environment',
      { defaultMessage: 'The transaction type the alert is created for' }
    ),
    name: 'environment',
  },
  threshold: {
    description: i18n.translate('xpack.apm.alerts.action_variables.threshold', {
      defaultMessage:
        'Any trigger value above this value will cause the alert to fire',
    }),
    name: 'threshold',
  },
  triggerValue: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.triggerValue',
      {
        defaultMessage:
          'The value that breached the threshold and triggered the alert',
      }
    ),
    name: 'triggerValue',
  },
  interval: {
    description: i18n.translate(
      'xpack.apm.alerts.action_variables.intervalSize',
      {
        defaultMessage:
          'The length and unit of the time period where the alert conditions were met',
      }
    ),
    name: 'interval',
  },
};
