/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import type { ServiceAlertsSeverity, SloStatus } from './service_inventory';

export enum ServiceHealthStatus {
  healthy = 'healthy',
  critical = 'critical',
  warning = 'warning',
  unknown = 'unknown',
}

export function getServiceHealthStatus({ severity }: { severity: ML_ANOMALY_SEVERITY }) {
  switch (severity) {
    case ML_ANOMALY_SEVERITY.CRITICAL:
    case ML_ANOMALY_SEVERITY.MAJOR:
      return ServiceHealthStatus.critical;

    case ML_ANOMALY_SEVERITY.MINOR:
    case ML_ANOMALY_SEVERITY.WARNING:
      return ServiceHealthStatus.warning;

    case ML_ANOMALY_SEVERITY.LOW:
      return ServiceHealthStatus.healthy;

    case ML_ANOMALY_SEVERITY.UNKNOWN:
      return ServiceHealthStatus.unknown;
  }
}

/**
 * Calculates combined health status from multiple signals:
 * - Alerts (with severity breakdown)
 * - SLO status
 * - Anomaly Detection (ML-based health)
 */
export function calculateCombinedHealthStatus({
  alertsSeverity,
  sloStatus,
  anomalyHealthStatus,
}: {
  alertsSeverity?: ServiceAlertsSeverity;
  sloStatus?: SloStatus;
  anomalyHealthStatus?: ServiceHealthStatus;
}): ServiceHealthStatus {
  // 1. Critical if ANY critical signal exists
  if (
    (alertsSeverity?.critical ?? 0) > 0 ||
    sloStatus === 'violated' ||
    anomalyHealthStatus === ServiceHealthStatus.critical
  ) {
    return ServiceHealthStatus.critical;
  }

  // 2. Warning if ANY warning signal exists
  if (
    (alertsSeverity?.warning ?? 0) > 0 ||
    sloStatus === 'degrading' ||
    sloStatus === 'noData' || // SLO can't be evaluated - treat as warning (TODO: revisit this decision)
    anomalyHealthStatus === ServiceHealthStatus.warning
  ) {
    return ServiceHealthStatus.warning;
  }

  // 3. Healthy if ALL available signals are explicitly healthy
  const hasNoAlerts = (alertsSeverity?.critical ?? 0) === 0 && (alertsSeverity?.warning ?? 0) === 0;
  const sloIsHealthy = !sloStatus || sloStatus === 'healthy';
  const anomalyIsHealthy =
    !anomalyHealthStatus || anomalyHealthStatus === ServiceHealthStatus.healthy;

  if (hasNoAlerts && sloIsHealthy && anomalyIsHealthy) {
    return ServiceHealthStatus.healthy;
  }

  // 4. Unknown - deferred for now
  return ServiceHealthStatus.unknown;
}

export function getServiceHealthStatusColor(
  euiTheme: EuiThemeComputed,
  status: ServiceHealthStatus
) {
  switch (status) {
    case ServiceHealthStatus.healthy:
      return euiTheme.colors.severity.success;
    case ServiceHealthStatus.warning:
      return euiTheme.colors.severity.warning;
    case ServiceHealthStatus.critical:
      return euiTheme.colors.severity.danger;
    case ServiceHealthStatus.unknown:
      return euiTheme.colors.mediumShade;
  }
}

export function getServiceHealthStatusBadgeColor(
  euiTheme: EuiThemeComputed,
  status: ServiceHealthStatus
) {
  switch (status) {
    case ServiceHealthStatus.healthy:
      return euiTheme.colors.severity.success;
    case ServiceHealthStatus.warning:
      return euiTheme.colors.severity.warning;
    case ServiceHealthStatus.critical:
      return euiTheme.colors.severity.risk;
    case ServiceHealthStatus.unknown:
      return euiTheme.colors.mediumShade;
  }
}

export function getServiceHealthStatusLabel(status: ServiceHealthStatus) {
  switch (status) {
    case ServiceHealthStatus.critical:
      return i18n.translate('xpack.apm.serviceHealthStatus.critical', {
        defaultMessage: 'Critical',
      });

    case ServiceHealthStatus.warning:
      return i18n.translate('xpack.apm.serviceHealthStatus.warning', {
        defaultMessage: 'Warning',
      });

    case ServiceHealthStatus.healthy:
      return i18n.translate('xpack.apm.serviceHealthStatus.healthy', {
        defaultMessage: 'Healthy',
      });

    case ServiceHealthStatus.unknown:
      return i18n.translate('xpack.apm.serviceHealthStatus.unknown', {
        defaultMessage: 'Unknown',
      });
  }
}
