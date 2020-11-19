/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_FETCH_FAILURE = i18n.translate(
  'xpack.securitySolution.containers.detectionEngine.alerts.errorFetchingAlertsDescription',
  {
    defaultMessage: 'Failed to query alerts',
  }
);

export const PRIVILEGE_FETCH_FAILURE = i18n.translate(
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
