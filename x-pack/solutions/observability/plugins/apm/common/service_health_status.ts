/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiThemeComputed } from '@elastic/eui';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';

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

export function getServiceHealthStatusColor(
  euiTheme: EuiThemeComputed,
  status: ServiceHealthStatus
) {
  const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

  switch (status) {
    case ServiceHealthStatus.healthy:
      return isAmsterdam ? euiTheme.colors.vis.euiColorVis0 : euiTheme.colors.severity.success;
    case ServiceHealthStatus.warning:
      return isAmsterdam ? euiTheme.colors.vis.euiColorVis5 : euiTheme.colors.severity.warning;
    case ServiceHealthStatus.critical:
      return isAmsterdam ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.severity.danger;
    case ServiceHealthStatus.unknown:
      return euiTheme.colors.mediumShade;
  }
}

export function getServiceHealthStatusBadgeColor(
  euiTheme: EuiThemeComputed,
  status: ServiceHealthStatus
) {
  const isAmsterdam = euiTheme.themeName === 'EUI_THEME_AMSTERDAM';

  switch (status) {
    case ServiceHealthStatus.healthy:
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText0
        : euiTheme.colors.severity.success;
    case ServiceHealthStatus.warning:
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText5
        : euiTheme.colors.severity.warning;
    case ServiceHealthStatus.critical:
      return isAmsterdam
        ? euiTheme.colors.vis.euiColorVisBehindText9
        : euiTheme.colors.severity.risk;
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
