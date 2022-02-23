/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

export const ALERTS_UNIT = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.alertsUnit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
  });

export const OPEN_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.openAlertsTitle',
  {
    defaultMessage: 'Open',
  }
);

export const CLOSED_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.closedAlertsTitle',
  {
    defaultMessage: 'Closed',
  }
);

export const ACKNOWLEDGED_ALERTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.acknowledgedAlertsTitle',
  {
    defaultMessage: 'Acknowledged',
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
    defaultMessage: 'alerts',
  }
);

export const ALERTS_HEADERS_RULE = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.ruleTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const ALERTS_HEADERS_RULE_NAME = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.ruleNameTitle',
  {
    defaultMessage: 'Rule name',
  }
);

export const ALERTS_HEADERS_RULE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.ruleDescriptionTitle',
  {
    defaultMessage: 'Rule description',
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

export const ALERTS_HEADERS_REASON = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.reasonTitle',
  {
    defaultMessage: 'Reason',
  }
);

export const ALERTS_HEADERS_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.riskScoreTitle',
  {
    defaultMessage: 'Risk Score',
  }
);

export const ALERTS_HEADERS_THRESHOLD_COUNT = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.thresholdCount',
  {
    defaultMessage: 'Threshold Count',
  }
);

export const ALERTS_HEADERS_THRESHOLD_TERMS = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.thresholdTerms',
  {
    defaultMessage: 'Threshold Terms',
  }
);

export const ALERTS_HEADERS_THRESHOLD_CARDINALITY = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.thresholdCardinality',
  {
    defaultMessage: 'Threshold Cardinality',
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

export const ACTION_ACKNOWLEDGED_ALERT = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.acknowledgedAlertTitle',
  {
    defaultMessage: 'Mark as acknowledged',
  }
);

export const ACTION_INVESTIGATE_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.investigateInTimelineTitle',
  {
    defaultMessage: 'Investigate in timeline',
  }
);

export const ACTION_INVESTIGATE_IN_TIMELINE_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.investigateInTimelineAriaLabel',
  {
    defaultMessage: 'Send alert to timeline',
  }
);

export const ACTION_ADD_EXCEPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addException',
  {
    defaultMessage: 'Add rule exception',
  }
);

export const ACTION_ADD_EVENT_FILTER = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addEventFilter',
  {
    defaultMessage: 'Add Endpoint event filter',
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

export const ALERT_DURATION = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.alertDurationTitle',
  {
    defaultMessage: 'Alert duration',
  }
);

export const OPENED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionEngine.alerts.openedAlertSuccessToastMessage', {
    values: { totalAlerts },
    defaultMessage:
      'Successfully opened {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}}.',
  });

export const ACKNOWLEDGED_ALERT_SUCCESS_TOAST = (totalAlerts: number) =>
  i18n.translate(
    'xpack.securitySolution.detectionEngine.alerts.acknowledgedAlertSuccessToastMessage',
    {
      values: { totalAlerts },
      defaultMessage:
        'Successfully marked {totalAlerts} {totalAlerts, plural, =1 {alert} other {alerts}} as acknowledged.',
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

export const ACKNOWLEDGED_ALERT_FAILED_TOAST = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.acknowledgedAlertFailedToastMessage',
  {
    defaultMessage: 'Failed to mark alert(s) as acknowledged',
  }
);

export const MORE_ACTIONS = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.moreActionsAriaLabel',
  {
    defaultMessage: 'More actions',
  }
);

export const STATUS = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.statusTitle',
  {
    defaultMessage: 'Status',
  }
);

export const CHANGE_ALERT_STATUS = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.overview.changeAlertStatus',
  {
    defaultMessage: 'Change alert status',
  }
);

export const CLICK_TO_CHANGE_ALERT_STATUS = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.overview.clickToChangeAlertStatus',
  {
    defaultMessage: 'Click to change alert status',
  }
);

export const SIGNAL_STATUS = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.overviewTable.signalStatusTitle',
  {
    defaultMessage: 'Status',
  }
);

export const TRIGGERED = i18n.translate(
  'xpack.securitySolution.eventsViewer.alerts.defaultHeaders.triggeredTitle',
  {
    defaultMessage: 'Triggered',
  }
);

export const ADD_TO_EXISTING_CASE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addToCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ADD_TO_NEW_CASE = i18n.translate(
  'xpack.securitySolution.detectionEngine.alerts.actions.addToNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);
