/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const JIRA_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.selectMessageText',
  {
    defaultMessage: 'Create an incident in Jira.',
  }
);

export const JIRA_TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.actionTypeTitle',
  {
    defaultMessage: 'Jira',
  }
);

export const API_URL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.apiUrlTextFieldLabel',
  {
    defaultMessage: 'URL',
  }
);

export const API_URL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredApiUrlTextField',
  {
    defaultMessage: 'URL is required.',
  }
);

export const API_URL_INVALID = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.invalidApiUrlTextField',
  {
    defaultMessage: 'URL is invalid.',
  }
);

export const API_URL_REQUIRE_HTTPS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requireHttpsApiUrlTextField',
  {
    defaultMessage: 'URL must start with https://.',
  }
);

export const JIRA_PROJECT_KEY_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.projectKey',
  {
    defaultMessage: 'Project key',
  }
);

export const JIRA_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredProjectKeyTextField',
  {
    defaultMessage: 'Project key is required',
  }
);

export const JIRA_AUTHENTICATION_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.authenticationLabel',
  {
    defaultMessage: 'Authentication',
  }
);

export const JIRA_REMEMBER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.rememberValuesLabel',
  {
    defaultMessage:
      'Remember these values. You must reenter them each time you edit the connector.',
  }
);

export const JIRA_REENTER_VALUES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.reenterValuesLabel',
  {
    defaultMessage:
      'Authentication credentials are encrypted. Please reenter values for these fields.',
  }
);

export const JIRA_EMAIL_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.emailTextFieldLabel',
  {
    defaultMessage: 'Username or email address',
  }
);

export const JIRA_EMAIL_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredEmailTextField',
  {
    defaultMessage: 'Username or email address is required',
  }
);

export const JIRA_API_TOKEN_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.apiTokenTextFieldLabel',
  {
    defaultMessage: 'API token or password',
  }
);

export const JIRA_API_TOKEN_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredApiTokenTextField',
  {
    defaultMessage: 'API token or password is required',
  }
);

export const MAPPING_FIELD_SUMMARY = i18n.translate(
  'xpack.triggersActionsUI.case.configureCases.mappingFieldSummary',
  {
    defaultMessage: 'Summary',
  }
);

export const DESCRIPTION_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredDescriptionTextField',
  {
    defaultMessage: 'Description is required.',
  }
);

export const TITLE_REQUIRED = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.requiredTitleTextField',
  {
    defaultMessage: 'Title is required.',
  }
);

export const MAPPING_FIELD_DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.mappingFieldDescription',
  {
    defaultMessage: 'Description',
  }
);

export const MAPPING_FIELD_COMMENTS = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.mappingFieldComments',
  {
    defaultMessage: 'Comments',
  }
);

export const ISSUE_TYPES_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.unableToGetIssueTypesMessage',
  {
    defaultMessage: 'Unable to get issue types',
  }
);

export const FIELDS_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.unableToGetFieldsMessage',
  {
    defaultMessage: 'Unable to get fields',
  }
);

export const ISSUES_API_ERROR = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.unableToGetIssuesMessage',
  {
    defaultMessage: 'Unable to get issues',
  }
);

export const GET_ISSUE_API_ERROR = (id: string) =>
  i18n.translate(
    'xpack.triggersActionsUI.components.builtinActionTypes.jira.unableToGetIssueMessage',
    {
      defaultMessage: 'Unable to get issue with id {id}',
      values: { id },
    }
  );

export const SEARCH_ISSUES_COMBO_BOX_ARIA_LABEL = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.searchIssuesComboBoxAriaLabel',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_PLACEHOLDER = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.searchIssuesComboBoxPlaceholder',
  {
    defaultMessage: 'Type to search',
  }
);

export const SEARCH_ISSUES_LOADING = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.jira.searchIssuesLoading',
  {
    defaultMessage: 'Loading...',
  }
);
