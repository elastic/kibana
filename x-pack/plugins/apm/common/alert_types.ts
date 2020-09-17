/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ValuesType } from 'utility-types';
import { ANOMALY_SEVERITY, ANOMALY_THRESHOLD } from '../../ml/common';

export enum AlertType {
  ErrorRate = 'apm.error_rate',
  TransactionDuration = 'apm.transaction_duration',
  TransactionDurationAnomaly = 'apm.transaction_duration_anomaly',
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
  [AlertType.TransactionDurationAnomaly]: {
    name: i18n.translate('xpack.apm.transactionDurationAnomalyAlert.name', {
      defaultMessage: 'Transaction duration anomaly',
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

export const ANOMALY_ALERT_SEVERITY_TYPES = [
  {
    type: ANOMALY_SEVERITY.CRITICAL,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.criticalLabel', {
      defaultMessage: 'critical',
    }),
    threshold: ANOMALY_THRESHOLD.CRITICAL,
  },
  {
    type: ANOMALY_SEVERITY.MAJOR,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.majorLabel', {
      defaultMessage: 'major',
    }),
    threshold: ANOMALY_THRESHOLD.MAJOR,
  },
  {
    type: ANOMALY_SEVERITY.MINOR,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.minor', {
      defaultMessage: 'minor',
    }),
    threshold: ANOMALY_THRESHOLD.MINOR,
  },
  {
    type: ANOMALY_SEVERITY.WARNING,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.warningLabel', {
      defaultMessage: 'warning',
    }),
    threshold: ANOMALY_THRESHOLD.WARNING,
  },
] as const;

export type AnomalyAlertSeverityType = ValuesType<
  typeof ANOMALY_ALERT_SEVERITY_TYPES
>['type'];
