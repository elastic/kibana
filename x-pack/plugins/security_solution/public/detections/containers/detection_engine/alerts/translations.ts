/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.errorFetchingAlertsDescription',
  {
    defaultMessage: 'Failed to query alerts',
  }
);

export const SIGNAL_GET_NAME_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.errorGetAlertDescription',
  {
    defaultMessage: 'Failed to get signal index name',
  }
);

export const SIGNAL_POST_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.errorPostAlertDescription',
  {
    defaultMessage: 'Failed to create signal index',
  }
);

export const HOST_ISOLATION_FAILURE = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.failedToIsolate.title',
  { defaultMessage: 'Failed to isolate host' }
);

export const CASES_FROM_ALERTS_FAILURE = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.casesFromAlerts.title',
  { defaultMessage: 'Failed to find associated cases' }
);

export const ISOLATION_STATUS_FAILURE = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.isolationStatus.title',
  { defaultMessage: 'Failed to retrieve current isolation status' }
);

export const ISOLATION_PENDING_FAILURE = i18n.translate(
  'xpack.securitySolution.endpoint.hostIsolation.isolationPending.title',
  { defaultMessage: 'Failed to retrieve isolation pending statuses' }
);
