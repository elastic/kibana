/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ENTITIES_NO_DATA_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.entitiesNoDataMessage',
  {
    defaultMessage: 'Host and user information are unavailable for this alert.',
  }
);

export const ANALYZER_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.analyzerErrorMessage',
  {
    defaultMessage: 'analyzer',
  }
);

export const SESSION_VIEW_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.sessionViewErrorMessage',
  {
    defaultMessage: 'session view',
  }
);

export const CORRELATIONS_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.correlationsErrorMessage',
  {
    defaultMessage: 'No correlations data available',
  }
);

export const USER_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.userTitle', {
  defaultMessage: 'User',
});

export const USER_PREVALENCE_COLUMN_TITLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.userPrevalenceColumTitleTooltip',
  {
    defaultMessage: 'Percentage of unique users with identical field value pairs',
  }
);

export const USERS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.usersInfoTitle',
  {
    defaultMessage: 'User information',
  }
);

export const RELATED_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsTitle',
  {
    defaultMessage: 'Related hosts',
  }
);

export const RELATED_HOSTS_TABLE_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsTableNoData',
  {
    defaultMessage: 'No hosts identified',
  }
);

export const RELATED_HOSTS_TOOL_TIP = (userName: string) =>
  i18n.translate('xpack.securitySolution.flyout.entities.relatedHostsToolTip', {
    defaultMessage:
      'After this alert was generated, {userName} logged into these hosts. Check if this activity is normal.',
    values: { userName },
  });

export const RELATED_ENTITIES_NAME_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedEntitiesNameColumn',
  {
    defaultMessage: 'Name',
  }
);

export const RELATED_ENTITIES_IP_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedEntitiesIpColumn',
  {
    defaultMessage: 'Ip addresses',
  }
);

export const HOST_TITLE = i18n.translate('xpack.securitySolution.flyout.entities.hostTitle', {
  defaultMessage: 'Host',
});

export const HOST_PREVALENCE_COLUMN_TITLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostPrevalenceColumTitleTooltip',
  {
    defaultMessage: 'Percentage of unique hosts with identical field value pairs',
  }
);

export const HOSTS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostsInfoTitle',
  {
    defaultMessage: 'Host information',
  }
);

export const RELATED_USERS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersTitle',
  {
    defaultMessage: 'Related users',
  }
);

export const RELATED_USERS_TABLE_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersTableNoData',
  {
    defaultMessage: 'No users identified',
  }
);

export const RELATED_USERS_TOOL_TIP = (hostName: string) =>
  i18n.translate('xpack.securitySolution.flyout.entities.relatedUsersToolTip', {
    defaultMessage:
      'After this alert was generated, these users logged into {hostName}. Check if this activity is normal.',
    values: { hostName },
  });

export const PREVALENCE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceErrorMessage',
  {
    defaultMessage: 'prevalence',
  }
);

export const PREVALENCE_NO_DATA_MESSAGE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceNoDataMessage',
  {
    defaultMessage: 'No prevalence data available',
  }
);

export const PREVALENCE_TABLE_FIELD_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableFieldColumnTitle',
  {
    defaultMessage: 'Field',
  }
);

export const PREVALENCE_TABLE_VALUE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableValueColumnTitle',
  {
    defaultMessage: 'Value',
  }
);

export const PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableAlertCountColumnTitle',
  {
    defaultMessage: 'Alert',
  }
);

export const PREVALENCE_TABLE_ALERT_COUNT_COLUMN_TITLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableAlertCountColumnTitleTooltip',
  {
    defaultMessage: 'Total number of alerts with identical field value pairs',
  }
);

export const PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableDocCountColumnTitle',
  {
    defaultMessage: 'Document',
  }
);

export const PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE_TOOLTIP = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableDocCountColumnTitleTooltip',
  {
    defaultMessage: 'Total number of event documents with identical field value pairs',
  }
);

export const PREVALENCE_TABLE_COUNT_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableCountColumnTitle',
  {
    defaultMessage: 'count',
  }
);

export const PREVALENCE_TABLE_PREVALENCE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTablePrevalenceColumnTitle',
  {
    defaultMessage: 'prevalence',
  }
);

export const RESPONSE_TITLE = i18n.translate('xpack.securitySolution.flyout.response.title', {
  defaultMessage: 'Responses',
});

export const CORRELATIONS_TIMESTAMP_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.timestampColumnTitle',
  {
    defaultMessage: 'Timestamp',
  }
);

export const CORRELATIONS_RULE_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.ruleColumnTitle',
  {
    defaultMessage: 'Rule',
  }
);

export const CORRELATIONS_REASON_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.reasonColumnTitle',
  {
    defaultMessage: 'Reason',
  }
);

export const CORRELATIONS_SEVERITY_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.severityColumnTitle',
  {
    defaultMessage: 'Severity',
  }
);

export const CORRELATIONS_CASE_STATUS_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.statusColumnTitle',
  {
    defaultMessage: 'Status',
  }
);

export const CORRELATIONS_CASE_NAME_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.correlations.caseNameColumnTitle',
  {
    defaultMessage: 'Name',
  }
);

export const CORRELATIONS_DETAILS_TABLE_FILTER = i18n.translate(
  'xpack.securitySolution.flyout.correlations.correlationsDetailsTableFilter',
  {
    defaultMessage: 'Correlations Details Table Alert IDs',
  }
);

export const RELATED_ALERTS_BY_ANCESTRY_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.correlations.relatedAlertsByAncestryNoData',
  {
    defaultMessage: 'No alerts related by ancestry',
  }
);

export const RELATED_ALERTS_BY_SOURCE_EVENT_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.correlations.relatedAlertsBySourceEventNoData',
  {
    defaultMessage: 'No related source events',
  }
);

export const RELATED_ALERTS_BY_SESSION_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.correlations.relatedAlertsBySessionNoData',
  {
    defaultMessage: 'No alerts related by session',
  }
);

export const RELATED_CASES_NO_DATA = i18n.translate(
  'xpack.securitySolution.flyout.correlations.relatedCasesNoData',
  {
    defaultMessage: 'No related cases',
  }
);
