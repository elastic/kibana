/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CASES_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.cases.title',
  {
    defaultMessage: 'Cases',
  }
);

export const CASES_PANEL_SUBTITLE = (caseCount: number) =>
  i18n.translate('xpack.securitySolution.alerts.alertDetails.summary.cases.subTitle', {
    values: { caseCount },
    defaultMessage: 'Showing the {caseCount} most recently created cases containing this alert',
  });

export const CASES_PANEL_CASE_STATUS = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.cases.status',
  {
    defaultMessage: 'Status',
  }
);

export const ALERT_REASON_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.alertReason.title',
  {
    defaultMessage: 'Alert reason',
  }
);

export const RULE_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.title',
  {
    defaultMessage: 'Rule',
  }
);

export const HOST_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.title',
  {
    defaultMessage: 'Host',
  }
);

export const USER_PANEL_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.title',
  {
    defaultMessage: 'User',
  }
);

export const RULE_NAME_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.name',
  {
    defaultMessage: 'Rule name',
  }
);

export const RISK_SCORE_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.riskScore',
  {
    defaultMessage: 'Risk score',
  }
);

export const SEVERITY_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.severity',
  {
    defaultMessage: 'Severity',
  }
);

export const RULE_DESCRIPTION_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.description',
  {
    defaultMessage: 'Rule description',
  }
);

export const OPEN_RULE_DETAILS_PAGE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.rule.action.openRuleDetailsPage',
  {
    defaultMessage: 'Open rule details page',
  }
);

export const NO_RELATED_CASES_FOUND = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.noCasesFound',
  {
    defaultMessage: 'Related cases were not found for this alert',
  }
);

export const LOADING_CASES = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.loading',
  {
    defaultMessage: 'Loading related cases...',
  }
);

export const ERROR_LOADING_CASES = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.error',
  {
    defaultMessage: 'Error loading related cases',
  }
);

export const CASE_NO_READ_PERMISSIONS = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.noRead',
  {
    defaultMessage:
      'You do not have the required permissions to view related cases. If you need to view cases, contact your Kibana administrator',
  }
);

export const ADD_TO_EXISTING_CASE_BUTTON = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.addToExistingCase',
  {
    defaultMessage: 'Add to existing case',
  }
);

export const ADD_TO_NEW_CASE_BUTTON = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.case.addToNewCase',
  {
    defaultMessage: 'Add to new case',
  }
);

export const HOST_NAME_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.hostName.title',
  {
    defaultMessage: 'Host name',
  }
);

export const OPERATING_SYSTEM_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.osName.title',
  {
    defaultMessage: 'Operating system',
  }
);

export const AGENT_STATUS_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.agentStatus.title',
  {
    defaultMessage: 'Agent status',
  }
);

export const IP_ADDRESSES_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.ipAddresses.title',
  {
    defaultMessage: 'IP addresses',
  }
);

export const LAST_SEEN_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.lastSeen.title',
  {
    defaultMessage: 'Last seen',
  }
);

export const VIEW_HOST_SUMMARY = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.action.viewHostSummary',
  {
    defaultMessage: 'View host summary',
  }
);

export const OPEN_HOST_DETAILS_PAGE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.action.openHostDetailsPage',
  {
    defaultMessage: 'Open host details page',
  }
);

export const HOST_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.riskScore',
  {
    defaultMessage: 'Host risk score',
  }
);

export const HOST_RISK_CLASSIFICATION = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.host.riskClassification',
  {
    defaultMessage: 'Host risk classification',
  }
);

export const USER_NAME_TITLE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.userName.title',
  {
    defaultMessage: 'User name',
  }
);

export const USER_RISK_SCORE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.riskScore',
  {
    defaultMessage: 'User risk score',
  }
);

export const USER_RISK_CLASSIFICATION = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.riskClassification',
  {
    defaultMessage: 'User risk classification',
  }
);

export const VIEW_USER_SUMMARY = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.action.viewUserSummary',
  {
    defaultMessage: 'View user summary',
  }
);

export const OPEN_USER_DETAILS_PAGE = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.user.action.openUserDetailsPage',
  {
    defaultMessage: 'Open user details page',
  }
);

export const SUMMARY_PANEL_ACTIONS = i18n.translate(
  'xpack.securitySolution.alerts.alertDetails.summary.panelMoreActions',
  {
    defaultMessage: 'More actions',
  }
);
