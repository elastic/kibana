/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const ISSUE_TYPES_API_ERROR = i18n.translate(
  'xpack.securitySolution.components.settings.jira.unableToGetIssueTypesMessage',
  {
    defaultMessage: 'Unable to get issue types',
  }
);

export const FIELDS_API_ERROR = i18n.translate(
  'xpack.securitySolution.components.settings.jira.unableToGetFieldsMessage',
  {
    defaultMessage: 'Unable to get fields',
  }
);

export const ISSUES_API_ERROR = i18n.translate(
  'xpack.securitySolution.components.settings.jira.unableToGetIssuesMessage',
  {
    defaultMessage: 'Unable to get issues',
  }
);

export const GET_ISSUE_API_ERROR = (id: string) =>
  i18n.translate('xpack.securitySolution.components.settings.jira.unableToGetIssueMessage', {
    defaultMessage: 'Unable to get issue with id {id}',
    values: { id },
  });

export const SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.components.settings.jira.searchIssuesComboBoxAriaLabel',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.components.settings.jira.searchIssuesComboBoxPlaceholder',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_LOADING = i18n.translate(
  'xpack.securitySolution.components.settings.jira.searchIssuesLoading',
  {
    defaultMessage: 'Loading...',
  }
);

export const PRIORITY = i18n.translate(
  'xpack.securitySolution.case.settings.jira.prioritySelectFieldLabel',
  {
    defaultMessage: 'Priority',
  }
);

export const ISSUE_TYPE = i18n.translate(
  'xpack.securitySolution.case.settings.jira.issueTypesSelectFieldLabel',
  {
    defaultMessage: 'Issue type',
  }
);

export const PARENT_ISSUE = i18n.translate(
  'xpack.securitySolution.case.settings.jira.parentIssueSearchLabel',
  {
    defaultMessage: 'Parent issue',
  }
);
