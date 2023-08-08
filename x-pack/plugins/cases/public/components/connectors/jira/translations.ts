/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ISSUE_TYPES_API_ERROR = i18n.translate(
  'xpack.cases.connectors.jira.unableToGetIssueTypesMessage',
  {
    defaultMessage: 'Unable to get issue types',
  }
);

export const FIELDS_API_ERROR = i18n.translate(
  'xpack.cases.connectors.jira.unableToGetFieldsMessage',
  {
    defaultMessage: 'Unable to get connectors',
  }
);

export const ISSUES_API_ERROR = i18n.translate(
  'xpack.cases.connectors.jira.unableToGetIssuesMessage',
  {
    defaultMessage: 'Unable to get issues',
  }
);

export const GET_ISSUE_API_ERROR = (id: string) =>
  i18n.translate('xpack.cases.connectors.jira.unableToGetIssueMessage', {
    defaultMessage: 'Unable to get issue with id {id}',
    values: { id },
  });

export const SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL = i18n.translate(
  'xpack.cases.connectors.jira.searchIssuesComboBoxAriaLabel',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_PLACEHOLDER = i18n.translate(
  'xpack.cases.connectors.jira.searchIssuesComboBoxPlaceholder',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_LOADING = i18n.translate(
  'xpack.cases.connectors.jira.searchIssuesLoading',
  {
    defaultMessage: 'Loading...',
  }
);

export const PRIORITY = i18n.translate('xpack.cases.connectors.jira.prioritySelectFieldLabel', {
  defaultMessage: 'Priority',
});

export const ISSUE_TYPE = i18n.translate('xpack.cases.connectors.jira.issueTypesSelectFieldLabel', {
  defaultMessage: 'Issue type',
});

export const PARENT_ISSUE = i18n.translate('xpack.cases.connectors.jira.parentIssueSearchLabel', {
  defaultMessage: 'Parent issue',
});

export const ISSUE_TYPE_REQUIRED = i18n.translate('xpack.cases.connectors.jira.issueTypeRequired', {
  defaultMessage: 'Issue type is required',
});
