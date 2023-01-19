/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const CHARTS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.chartsTitle',
  {
    defaultMessage: 'Charts',
  }
);

export const SEVERITY_LEVELS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.severity.severityDonutTitle',
  {
    defaultMessage: 'Severity levels',
  }
);

export const UNKNOWN_SEVERITY = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.severity.unknown',
  {
    defaultMessage: 'Unknown',
  }
);

export const SEVERITY_LEVEL_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.severity.severityTableLevelColumn',
  { defaultMessage: 'Levels' }
);

export const ALERTS_TYPE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByType.alertTypeChartTitle',
  {
    defaultMessage: 'Alerts by type',
  }
);

export const ALERTS_TYPE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByType.typeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const PREVENTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByType.preventions',
  {
    defaultMessage: 'Preventions',
  }
);

export const DETECTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByType.detections',
  {
    defaultMessage: 'Detections',
  }
);

export const ALERT_BY_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsByHost.hostChartTitle',
  {
    defaultMessage: 'Top alerts by',
  }
);
