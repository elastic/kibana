/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ANOMALIES_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.anomaliesTitle',
  {
    defaultMessage: 'Anomalies',
  }
);

export const ANOMALY_NAME = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.anomalyName',
  {
    defaultMessage: 'Anomaly name',
  }
);

export const ANOMALY_COUNT = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.anomalyCount',
  {
    defaultMessage: 'Count',
  }
);

export const VIEW_ALL_USERS_ANOMALIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.viewUsersAnomalies',
  {
    defaultMessage: 'View all user anomalies',
  }
);

export const VIEW_ALL_HOSTS_ANOMALIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.viewHostsAnomalies',
  {
    defaultMessage: 'View all host anomalies',
  }
);

export const VIEW_ALL_ANOMALIES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.viewAnomalies',
  {
    defaultMessage: 'View all',
  }
);

export const RUN_JOB = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.enableJob',
  {
    defaultMessage: 'Run job',
  }
);

export const JOB_STATUS_DISABLED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.jobStatusDisabled',
  {
    defaultMessage: 'disabled',
  }
);

export const JOB_STATUS_UNINSTALLED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.jobStatusUninstalled',
  {
    defaultMessage: 'uninstalled',
  }
);

export const JOB_STATUS_FAILED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.jobStatusFailed',
  {
    defaultMessage: 'failed',
  }
);

export const JOB_STATUS_WAITING = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.jobStatusLoading',
  {
    defaultMessage: 'Waiting',
  }
);

export const MODULE_NOT_COMPATIBLE_TITLE = (incompatibleJobCount: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.anomalies.moduleNotCompatibleTitle', {
    values: { incompatibleJobCount },
    defaultMessage:
      '{incompatibleJobCount} {incompatibleJobCount, plural, =1 {job is} other {jobs are}} currently unavailable',
  });

export const ANOMALY_DETECTION_DOCS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.anomalies.AnomalyDetectionDocsTitle',
  {
    defaultMessage: 'Anomaly Detection with Machine Learning',
  }
);
