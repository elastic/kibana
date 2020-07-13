/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PAGE_TITLE = i18n.translate('xpack.securitySolution.detectionEngine.pageTitle', {
  defaultMessage: 'Detection engine',
});

export const ALERTS_DOCUMENT_TYPE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.documentTypeTitle',
  {
    defaultMessage: 'Alerts',
  }
);

export const OPEN_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.openAlertsTitle',
  {
    defaultMessage: 'Open alerts',
  }
);

export const CLOSED_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.closedAlertsTitle',
  {
    defaultMessage: 'Closed alerts',
  }
);

export const IN_PROGRESS_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.inProgressAlertsTitle',
  {
    defaultMessage: 'In progress alerts',
  }
);

export const LOADING_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.loadingAlertsTitle',
  {
    defaultMessage: 'Loading Alerts',
  }
);

export const TOTAL_COUNT_OF_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.totalCountOfAlertsTitle',
  {
    defaultMessage: 'alerts match the search criteria',
  }
);

export const ALERTS_HEADERS_RULE = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.ruleTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const ALERTS_HEADERS_VERSION = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.versionTitle',
  {
    defaultMessage: 'Version',
  }
);

export const ALERTS_HEADERS_METHOD = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.methodTitle',
  {
    defaultMessage: 'Method',
  }
);

export const ALERTS_HEADERS_SEVERITY = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.severityTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const ALERTS_HEADERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.riskScoreTitle',
  {
    defaultMessage: 'Risk Score',
  }
);

export const ACTION_OPEN_ALERT = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.openAlertTitle',
  {
    defaultMessage: 'Open alert',
  }
);

export const ACTION_CLOSE_ALERT = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.closeAlertTitle',
  {
    defaultMessage: 'Close alert',
  }
);

export const ACTION_IN_PROGRESS_ALERT = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.inProgressAlertTitle',
  {
    defaultMessage: 'Mark in progress',
  }
);

export const ACTION_INVESTIGATE_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.investigateInTimelineTitle',
  {
    defaultMessage: 'Investigate in timeline',
  }
);

export const ACTION_ADD_EXCEPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addException',
  {
    defaultMessage: 'Add exception',
  }
);

export const ACTION_ADD_ENDPOINT_EXCEPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addEndpointException',
  {
    defaultMessage: 'Add Endpoint exception',
  }
);

export const CLOSED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.closedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully closed {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const OPENED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.openedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully opened {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const IN_PROGRESS_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.alerts.inProgressAlertSuccessToastMessage',
    {
      values: { totalAlerts },
      defaultMessage:
        'Successfully marked {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}} as in progress.',
    }
  );

export const CLOSED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.closedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to close alert(s).',
  }
);

export const OPENED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.openedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to open alert(s)',
  }
);

export const IN_PROGRESS_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.inProgressAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to mark alert(s) as in progress',
  }
);
