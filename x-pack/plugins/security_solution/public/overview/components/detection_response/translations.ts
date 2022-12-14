/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const STATUS_CRITICAL_LABEL = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsByStatus.donut.criticalLabel',
  {
    defaultMessage: 'Critical',
  }
);
export const STATUS_HIGH_LABEL = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsByStatus.donut.highLabel',
  {
    defaultMessage: 'High',
  }
);
export const STATUS_MEDIUM_LABEL = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsByStatus.donut.mediumLabel',
  {
    defaultMessage: 'Medium',
  }
);
export const STATUS_LOW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsByStatus.donut.lowLabel',
  {
    defaultMessage: 'Low',
  }
);
export const STATUS_ACKNOWLEDGED = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsByStatus.status.acknowledged',
  {
    defaultMessage: 'Acknowledged',
  }
);
export const STATUS_OPEN = i18n.translate('xpack.securitySolution.detectionResponse.status.open', {
  defaultMessage: 'Open',
});
export const STATUS_CLOSED = i18n.translate(
  'xpack.securitySolution.detectionResponse.status.closed',
  {
    defaultMessage: 'Closed',
  }
);
export const STATUS_IN_PROGRESS = i18n.translate(
  'xpack.securitySolution.detectionResponse.status.inProgress',
  {
    defaultMessage: 'In progress',
  }
);
export const ALERTS = (totalAlerts: number) =>
  i18n.translate('xpack.securitySolution.detectionResponse.alertsByStatus.totalAlerts', {
    values: { totalAlerts },
    defaultMessage: 'total {totalAlerts, plural, =1 {alert} other {alerts}}',
  });
export const ALERTS_TEXT = i18n.translate('xpack.securitySolution.detectionResponse.alerts', {
  defaultMessage: 'Alerts',
});
export const ALERTS_BY_SEVERITY_TEXT = i18n.translate(
  'xpack.securitySolution.detectionResponse.alertsBySeverity',
  {
    defaultMessage: 'Alerts by Severity',
  }
);

export const UPDATING = i18n.translate('xpack.securitySolution.detectionResponse.updating', {
  defaultMessage: 'Updating...',
});
export const UPDATED = i18n.translate('xpack.securitySolution.detectionResponse.updated', {
  defaultMessage: 'Updated',
});
export const CASES = (totalCases: number) =>
  i18n.translate('xpack.securitySolution.detectionResponse.casesByStatus.totalCases', {
    values: { totalCases },
    defaultMessage: 'total {totalCases, plural, =1 {case} other {cases}}',
  });
export const CASES_BY_STATUS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.casesByStatusSectionTitle',
  {
    defaultMessage: 'Cases',
  }
);

export const VIEW_CASES = i18n.translate('xpack.securitySolution.detectionResponse.viewCases', {
  defaultMessage: 'View cases',
});

export const RULE_ALERTS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.ruleAlertsSectionTitle',
  {
    defaultMessage: 'Open alerts by rule',
  }
);

export const HOST_ALERTS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.hostAlertsSectionTitle',
  {
    defaultMessage: 'Hosts by alert severity',
  }
);

export const USER_ALERTS_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.userAlertsSectionTitle',
  {
    defaultMessage: 'Users by alert severity',
  }
);

export const CASES_TABLE_SECTION_TITLE = i18n.translate(
  'xpack.securitySolution.detectionResponse.caseSectionTitle',
  {
    defaultMessage: 'Recently created cases',
  }
);

export const NO_ALERTS_FOUND = i18n.translate(
  'xpack.securitySolution.detectionResponse.noRuleAlerts',
  {
    defaultMessage: 'No alerts to display',
  }
);

export const NO_CASES_FOUND = i18n.translate(
  'xpack.securitySolution.detectionResponse.noRecentCases',
  {
    defaultMessage: 'No cases to display',
  }
);
export const RULE_ALERTS_COLUMN_RULE_NAME = i18n.translate(
  'xpack.securitySolution.detectionResponse.ruleAlertsColumnRuleName',
  {
    defaultMessage: 'Rule name',
  }
);
export const RULE_ALERTS_COLUMN_LAST_ALERT = i18n.translate(
  'xpack.securitySolution.detectionResponse.ruleAlertsColumnLastAlert',
  {
    defaultMessage: 'Last alert',
  }
);
export const RULE_ALERTS_COLUMN_ALERT_COUNT = i18n.translate(
  'xpack.securitySolution.detectionResponse.ruleAlertsColumnAlertCount',
  {
    defaultMessage: 'Alert count',
  }
);
export const RULE_ALERTS_COLUMN_SEVERITY = i18n.translate(
  'xpack.securitySolution.detectionResponse.ruleAlertsColumnSeverity',
  {
    defaultMessage: 'Severity',
  }
);
export const OPEN_RULE_DETAIL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.openRuleDetailTooltip',
  {
    defaultMessage: 'Open rule detail',
  }
);
export const OPEN_CASE_DETAIL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.openCaseDetailTooltip',
  {
    defaultMessage: 'Open case detail',
  }
);
export const OPEN_HOST_DETAIL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.openHostDetailTooltip',
  {
    defaultMessage: 'Open host detail',
  }
);
export const OPEN_USER_DETAIL_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.openUserDetailTooltip',
  {
    defaultMessage: 'Open user detail',
  }
);

export const OPEN_ALL_ALERTS_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionResponse.openAllAlertsButton',
  {
    defaultMessage: 'View all open alerts',
  }
);

export const VIEW_RECENT_CASES = i18n.translate(
  'xpack.securitySolution.detectionResponse.viewRecentCases',
  {
    defaultMessage: 'View recent cases',
  }
);

export const HOST_ALERTS_HOSTNAME_COLUMN = i18n.translate(
  'xpack.securitySolution.detectionResponse.hostAlertsHostName',
  {
    defaultMessage: 'Host name',
  }
);

export const USER_ALERTS_USERNAME_COLUMN = i18n.translate(
  'xpack.securitySolution.detectionResponse.userAlertsUserName',
  {
    defaultMessage: 'User name',
  }
);

export const CASES_TABLE_COLUMN_NAME = i18n.translate(
  'xpack.securitySolution.detectionResponse.caseColumnName',
  {
    defaultMessage: 'Name',
  }
);

export const CASES_TABLE_COLUMN_TIME = i18n.translate(
  'xpack.securitySolution.detectionResponse.caseColumnTime',
  {
    defaultMessage: 'Time',
  }
);

export const CASES_TABLE_COLUMN_CREATED_BY = i18n.translate(
  'xpack.securitySolution.detectionResponse.caseColumnCreatedBy',
  {
    defaultMessage: 'Created by',
  }
);

export const CASES_TABLE_COLUMN_STATUS = i18n.translate(
  'xpack.securitySolution.detectionResponse.caseColumnStatus',
  {
    defaultMessage: 'Status',
  }
);

export const ERROR_MESSAGE_CASES = i18n.translate(
  'xpack.securitySolution.detectionResponse.errorMessage',
  {
    defaultMessage: 'Error fetching case data',
  }
);

export const HOST_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.hostSectionTooltip',
  {
    defaultMessage: 'Maximum of 100 hosts. Please consult Alerts page for further information.',
  }
);

export const USER_TOOLTIP = i18n.translate(
  'xpack.securitySolution.detectionResponse.userSectionTooltip',
  {
    defaultMessage: 'Maximum of 100 users. Please consult Alerts page for further information.',
  }
);
export const INVESTIGATE_IN_TIMELINE = i18n.translate(
  'xpack.securitySolution.detectionResponse.investigateInTimeline',
  {
    defaultMessage: 'Investigate in Timeline',
  }
);
