/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

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

export const USERS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.usersInfoTitle',
  {
    defaultMessage: 'User info',
  }
);

export const RELATED_HOSTS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsTitle',
  {
    defaultMessage: 'Related hosts',
  }
);

export const RELATED_HOSTS_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedHostsToolTip',
  {
    defaultMessage: 'The user successfully authenticated to these hosts after the alert.',
  }
);

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

export const HOSTS_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.hostsInfoTitle',
  {
    defaultMessage: 'Host info',
  }
);

export const RELATED_USERS_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersTitle',
  {
    defaultMessage: 'Related users',
  }
);

export const RELATED_USERS_TOOL_TIP = i18n.translate(
  'xpack.securitySolution.flyout.entities.relatedUsersToolTip',
  {
    defaultMessage: 'These users successfully authenticated to the affected host after the alert.',
  }
);

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

export const PREVALENCE_TABLE_DOC_COUNT_COLUMN_TITLE = i18n.translate(
  'xpack.securitySolution.flyout.prevalenceTableDocCountColumnTitle',
  {
    defaultMessage: 'Document',
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

export const RESPONSE_EMPTY = i18n.translate('xpack.securitySolution.flyout.response.empty', {
  defaultMessage: 'There are no response actions defined for this event.',
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
