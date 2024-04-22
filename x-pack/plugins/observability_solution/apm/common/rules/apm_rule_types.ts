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
} from '@kbn/observability-plugin/common';
import type { ActionGroup } from '@kbn/alerting-plugin/common';
import { formatDurationFromTimeUnitChar } from '@kbn/observability-plugin/common';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';
import { ApmRuleType } from '@kbn/rule-data-utils';
import {
  ERROR_GROUP_ID,
  ERROR_GROUP_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../es_fields/apm';
import { getEnvironmentLabel } from '../environment_filter_values';
import { AnomalyDetectorType } from '../anomaly_detection/apm_ml_detectors';

export const APM_SERVER_FEATURE_ID = 'apm';

export enum AggregationType {
  Avg = 'avg',
  P95 = '95th',
  P99 = '99th',
}

export const THRESHOLD_MET_GROUP_ID = 'threshold_met';
export type ThresholdMetActionGroupId = typeof THRESHOLD_MET_GROUP_ID;
export const THRESHOLD_MET_GROUP: ActionGroup<ThresholdMetActionGroupId> = {
  id: THRESHOLD_MET_GROUP_ID,
  name: i18n.translate('xpack.apm.a.thresholdMet', {
    defaultMessage: 'Threshold met',
  }),
};

const getFieldNameLabel = (field: string): string => {
  switch (field) {
    case SERVICE_NAME:
      return 'service';
    case SERVICE_ENVIRONMENT:
      return 'env';
    case TRANSACTION_TYPE:
      return 'type';
    case TRANSACTION_NAME:
      return 'name';
    case ERROR_GROUP_ID:
      return 'error key';
    case ERROR_GROUP_NAME:
      return 'error name';
    default:
      return field;
  }
};

export const getFieldValueLabel = (
  field: string,
  fieldValue: string
): string => {
  return field === SERVICE_ENVIRONMENT
    ? getEnvironmentLabel(fieldValue)
    : fieldValue;
};

const formatGroupByFields = (groupByFields: Record<string, string>): string => {
  const groupByFieldLabels = Object.keys(groupByFields).map(
    (field) =>
      `${getFieldNameLabel(field)}: ${getFieldValueLabel(
        field,
        groupByFields[field]
      )}`
  );
  return groupByFieldLabels.join(', ');
};

export function formatErrorCountReason({
  threshold,
  measured,
  windowSize,
  windowUnit,
  groupByFields,
}: {
  threshold: number;
  measured: number;
  windowSize: number;
  windowUnit: string;
  groupByFields: Record<string, string>;
}) {
  return i18n.translate('xpack.apm.alertTypes.errorCount.reason', {
    defaultMessage: `Error count is {measured} in the last {interval} for {group}. Alert when > {threshold}.`,
    values: {
      threshold,
      measured,
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
      group: formatGroupByFields(groupByFields),
    },
  });
}

export function formatTransactionDurationReason({
  threshold,
  measured,
  asDuration,
  aggregationType,
  windowSize,
  windowUnit,
  groupByFields,
}: {
  threshold: number;
  measured: number;
  asDuration: AsDuration;
  aggregationType: string;
  windowSize: number;
  windowUnit: string;
  groupByFields: Record<string, string>;
}) {
  let aggregationTypeFormatted =
    aggregationType.charAt(0).toUpperCase() + aggregationType.slice(1);
  if (aggregationTypeFormatted === 'Avg')
    aggregationTypeFormatted = aggregationTypeFormatted + '.';

  return i18n.translate('xpack.apm.alertTypes.transactionDuration.reason', {
    defaultMessage: `{aggregationType} latency is {measured} in the last {interval} for {group}. Alert when > {threshold}.`,
    values: {
      threshold: asDuration(threshold),
      measured: asDuration(measured),
      aggregationType: aggregationTypeFormatted,
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
      group: formatGroupByFields(groupByFields),
    },
  });
}

export function formatTransactionErrorRateReason({
  threshold,
  measured,
  asPercent,
  windowSize,
  windowUnit,
  groupByFields,
}: {
  threshold: number;
  measured: number;
  asPercent: AsPercent;
  windowSize: number;
  windowUnit: string;
  groupByFields: Record<string, string>;
}) {
  return i18n.translate('xpack.apm.alertTypes.transactionErrorRate.reason', {
    defaultMessage: `Failed transactions is {measured} in the last {interval} for {group}. Alert when > {threshold}.`,
    values: {
      threshold: asPercent(threshold, 100),
      measured: asPercent(measured, 100),
      interval: formatDurationFromTimeUnitChar(
        windowSize,
        windowUnit as TimeUnitChar
      ),
      group: formatGroupByFields(groupByFields),
    },
  });
}

export function formatAnomalyReason({
  serviceName,
  severityLevel,
  anomalyScore,
  windowSize,
  windowUnit,
  detectorType,
}: {
  serviceName: string;
  severityLevel: string;
  anomalyScore: number;
  windowSize: number;
  windowUnit: string;
  detectorType: AnomalyDetectorType;
}) {
  return i18n.translate(
    'xpack.apm.alertTypes.transactionDurationAnomaly.reason',
    {
      defaultMessage: `{severityLevel} {detectorTypeLabel} anomaly with a score of {anomalyScore}, was detected in the last {interval} for {serviceName}.`,
      values: {
        serviceName,
        severityLevel,
        detectorTypeLabel: getApmMlDetectorLabel(detectorType),
        anomalyScore,
        interval: formatDurationFromTimeUnitChar(
          windowSize,
          windowUnit as TimeUnitChar
        ),
      },
    }
  );
}

export const RULE_TYPES_CONFIG: Record<
  ApmRuleType,
  {
    name: string;
    actionGroups: Array<ActionGroup<ThresholdMetActionGroupId>>;
    defaultActionGroupId: ThresholdMetActionGroupId;
    minimumLicenseRequired: string;
    isExportable: boolean;
    producer: string;
  }
> = {
  [ApmRuleType.ErrorCount]: {
    name: i18n.translate('xpack.apm.errorCountAlert.name', {
      defaultMessage: 'Error count threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [ApmRuleType.TransactionDuration]: {
    name: i18n.translate('xpack.apm.transactionDurationAlert.name', {
      defaultMessage: 'Latency threshold',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [ApmRuleType.Anomaly]: {
    name: i18n.translate('xpack.apm.anomalyAlert.name', {
      defaultMessage: 'APM Anomaly',
    }),
    actionGroups: [THRESHOLD_MET_GROUP],
    defaultActionGroupId: THRESHOLD_MET_GROUP_ID,
    minimumLicenseRequired: 'basic',
    producer: APM_SERVER_FEATURE_ID,
    isExportable: true,
  },
  [ApmRuleType.TransactionErrorRate]: {
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
    type: ML_ANOMALY_SEVERITY.CRITICAL,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.criticalLabel', {
      defaultMessage: 'critical',
    }),
    threshold: ML_ANOMALY_THRESHOLD.CRITICAL,
  },
  {
    type: ML_ANOMALY_SEVERITY.MAJOR,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.majorLabel', {
      defaultMessage: 'major',
    }),
    threshold: ML_ANOMALY_THRESHOLD.MAJOR,
  },
  {
    type: ML_ANOMALY_SEVERITY.MINOR,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.minor', {
      defaultMessage: 'minor',
    }),
    threshold: ML_ANOMALY_THRESHOLD.MINOR,
  },
  {
    type: ML_ANOMALY_SEVERITY.WARNING,
    label: i18n.translate('xpack.apm.alerts.anomalySeverity.warningLabel', {
      defaultMessage: 'warning',
    }),
    threshold: ML_ANOMALY_THRESHOLD.WARNING,
  },
] as const;

export type AnomalyAlertSeverityType = ValuesType<
  typeof ANOMALY_ALERT_SEVERITY_TYPES
>['type'];

export function getApmMlDetectorLabel(type: AnomalyDetectorType) {
  switch (type) {
    case AnomalyDetectorType.txLatency:
      return i18n.translate('xpack.apm.alerts.anomalyDetector.latencyLabel', {
        defaultMessage: 'latency',
      });
    case AnomalyDetectorType.txThroughput:
      return i18n.translate(
        'xpack.apm.alerts.anomalyDetector.throughputLabel',
        {
          defaultMessage: 'throughput',
        }
      );
    case AnomalyDetectorType.txFailureRate:
      return i18n.translate(
        'xpack.apm.alerts.anomalyDetector.failedTransactionRateLabel',
        {
          defaultMessage: 'failed transaction rate',
        }
      );
  }
}

export const ANOMALY_DETECTOR_SELECTOR_OPTIONS = [
  AnomalyDetectorType.txLatency,
  AnomalyDetectorType.txThroughput,
  AnomalyDetectorType.txFailureRate,
].map((type) => ({ type, label: getApmMlDetectorLabel(type) }));

// Server side registrations
// x-pack/plugins/observability_solution/apm/server/lib/alerts/<alert>.ts
// x-pack/plugins/observability_solution/apm/server/lib/alerts/register_apm_alerts.ts

// Client side registrations:
// x-pack/plugins/observability_solution/apm/public/components/alerting/<alert>/index.tsx
// x-pack/plugins/observability_solution/apm/public/components/alerting/register_apm_alerts
