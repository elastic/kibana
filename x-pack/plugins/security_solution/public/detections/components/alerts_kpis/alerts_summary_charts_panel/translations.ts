/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const CHARTS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.charts.chartsTitle',
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
  {
    defaultMessage: 'Levels',
  }
);

export const COUNT_COULMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.countColumn',
  {
    defaultMessage: 'Counts',
  }
);

export const DETECTIONS_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.detections.detectionTableTitle',
  {
    defaultMessage: 'Alerts by type',
  }
);

export const DETECTIONS_TYPE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.detections.detectionTableTypeColumn',
  {
    defaultMessage: 'Type',
  }
);

export const DETECTIONS_PREVENTIONS_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.detections.detectionTablePreventionsColumn',
  {
    defaultMessage: 'Preventions',
  }
);

export const ALERT_BY_HOST_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.alertsBySeverity.chartAlertHostTitle',
  {
    defaultMessage: 'Top 10 hosts by alerts',
  }
);
