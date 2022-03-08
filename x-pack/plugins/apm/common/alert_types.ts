/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ValuesType } from 'utility-types';
import type {
  AsDuration,
  AsPercent,
  TimeUnitChar,
} from '../../observability/common';
import type { ActionGroup } from '../../alerting/common';
import { ANOMALY_SEVERITY, ANOMALY_THRESHOLD } from './ml_constants';
import { formatDurationFromTimeUnitChar } from '../../observability/common';

export const APM_SERVER_FEATURE_ID = 'apm';

export enum AlertType {
  ErrorCount = 'apm.error_rate', // ErrorRate was renamed to ErrorCount but the key is kept as `error_rate` for backwards-compat.
  TransactionErrorRate = 'apm.transaction_error_rate',
  TransactionDuration = 'apm.transaction_duration',
  TransactionDurationAnomaly = 'apm.transaction_duration_anomaly',
}

export const THRESHOLD_MET_GROUP_ID = 'threshold_met';
export type ThresholdMetActionGroupId = typeof THRESHOLD_MET_GROUP_ID;
const THRESHOLD_MET_GROUP: ActionGroup<ThresholdMetActionGroupId> = {
  id: THRESHOLD_MET_GROUP_ID,
  name: i18n.translate('xpack.apm.a.thresholdMet', {
    defaultMessage: 'Threshold met',
  }),
};

export function formatErrorCountReason({
  threshold,
  measured,
  serviceName,
  windowSize,
  windowUnit,
}: {
  threshold: number;
  measured: number;
  serviceName: string;
  windowSize: number;
  windowUnit: string;
}) {
  return i18n.translate('xpack.apm.alertTypes.errorCount.reason', {
    defaultMessage: `Error count is {measured} in the last {interval} for {serviceName}. Alert when > {threshold}.`,
    values: {
      threshold,
      measured,
      serviceName,
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
    },
  });
}

export function formatTransactionDurationReason({
  threshold,
  measured,
  serviceName,
  asDuration,
  aggregationType,
  windowSize,
  windowUnit,
}: {
  threshold: number;
  measured: number;
  serviceName: string;
  asDuration: AsDuration;
  aggregationType: string;
  windowSize: number;
  windowUnit: string;
}) {
  let aggregationTypeFormatted =
    aggregationType.charAt(0).toUpperCase() + aggregationType.slice(1);
  if (aggregationTypeFormatted === 'Avg')
    aggregationTypeFormatted = aggregationTypeFormatted + '.';

  return i18n.translate('xpack.apm.alertTypes.transactionDuration.reason', {
    defaultMessage: `{aggregationType} latency is {measured} in the last {interval} for {serviceName}. Alert when > {threshold}.`,
    values: {
      threshold: asDuration(threshold),
      measured: asDuration(measured),
      serviceName,
      aggregationType: aggregationTypeFormatted,
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
    },
  });
}

export function formatTransactionErrorRateReason({
  threshold,
  measured,
  serviceName,
  asPercent,
  windowSize,
  windowUnit,
}: {
  threshold: number;
  measured: number;
  serviceName: string;
  asPercent: AsPercent;
  windowSize: number;
  windowUnit: string;
}) {
  return i18n.translate('xpack.apm.alertTypes.transactionErrorRate.reason', {
    defaultMessage: `Failed transactions is {measured} in the last {interval} for {serviceName}. Alert when > {threshold}.`,
    values: {
      threshold: asPercent(threshold, 100),
      measured: asPercent(measured, 100),
      serviceName,
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
    },
  });
}

export function formatTransactionDurationAnomalyReason({
  serviceName,
  severityLevel,
  measured,
  windowSize,
  windowUnit,
}: {
  serviceName: string;
  severityLevel: string;
  measured: number;
  windowSize: number;
  windowUnit: string;
}) {
  return i18n.translate(
    'xpack.apm.alertTypes.transactionDurationAnomaly.reason',
    {
      defaultMessage: `{severityLevel} anomaly with a score of {measured} was detected in the last {interval} for {serviceName}.`,
      values: {
        serviceName,
        severityLevel,
        measured,
        interval: formatDurationFromTimeUnitChar(
          windowSize,
          windowUnit as TimeUnitChar
        ),
      },
    }
  );
}

export const ALERT_TYPES_CONFIG: Record<
  AlertType,
  {
    name: string;
    actionGroups: Array<ActionGroup<ThresholdMetActionGroupId>>;
    defaultActionGroupId: ThresholdMetActionGroupId;
    minimumLicenseRequired: string;
    isExportable: boolean;
    producer: string;
  }
> = {
  [AlertType.ErrorCount]: {
    name: i18n.translate('xpack.apm.errorCountAlert.name', {
      defaultMessage: 'Error count threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [AlertType.TransactionDuration]: {
    name: i18n.translate('xpack.apm.transactionDurationAlert.name', {
      defaultMessage: 'Latency threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [AlertType.TransactionDurationAnomaly]: {
    name: i18n.translate('xpack.apm.transactionDurationAnomalyAlert.name', {
      defaultMessage: 'Latency anomaly',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [AlertType.TransactionErrorRate]: {
    name: i18n.translate('xpack.apm.transactionErrorRateAlert.name', {
      defaultMessage: 'Failed transaction rate threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
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

// Server side registrations
// x-pack/plugins/apm/server/lib/alerts/<alert>.ts
// x-pack/plugins/apm/server/lib/alerts/register_apm_alerts.ts

// Client side registrations:
// x-pack/plugins/apm/public/components/alerting/<alert>/index.tsx
// x-pack/plugins/apm/public/components/alerting/register_apm_alerts
