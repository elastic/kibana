/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export enum AlertType {
  ErrorRate = 'apm.error_rate',
  TransactionDuration = 'apm.transaction_duration',
}

export const ALERT_TYPES_CONFIG = {
  [AlertType.ErrorRate]: {
    name: i18n.translate('xpack.apm.errorRateAlert.name', {
      defaultMessage: 'Error rate',
    }),
    actionGroups: [
      {
        id: 'threshold_met',
        name: i18n.translate('xpack.apm.errorRateAlert.thresholdMet', {
          defaultMessage: 'Threshold met',
        }),
      },
    ],
    defaultActionGroupId: 'threshold_met',
    producer: 'apm',
  },
  [AlertType.TransactionDuration]: {
    name: i18n.translate('xpack.apm.transactionDurationAlert.name', {
      defaultMessage: 'Transaction duration',
    }),
    actionGroups: [
      {
        id: 'threshold_met',
        name: i18n.translate(
          'xpack.apm.transactionDurationAlert.thresholdMet',
          {
            defaultMessage: 'Threshold met',
          }
        ),
      },
    ],
    defaultActionGroupId: 'threshold_met',
    producer: 'apm',
  },
};

export const TRANSACTION_ALERT_AGGREGATION_TYPES = {
  avg: i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.avg',
    {
      defaultMessage: 'Average',
    }
  ),
  '95th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.95th',
    {
      defaultMessage: '95th percentile',
    }
  ),
  '99th': i18n.translate(
    'xpack.apm.transactionDurationAlert.aggregationType.99th',
    {
      defaultMessage: '99th percentile',
    }
  ),
};
