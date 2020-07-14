/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const JIRA_DESC = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.selectMessageText',
  {
    defaultMessage: 'Push or update Security case data to a new issue in Jira',
  }
);

export const JIRA_TITLE = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.actionTypeTitle',
  {
    defaultMessage: 'Jira',
  }
);

export const JIRA_PROJECT_KEY_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.projectKey',
  {
    defaultMessage: 'Project key',
  }
);

export const JIRA_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.requiredProjectKeyTextField',
  {
    defaultMessage: 'Project key is required',
  }
);

export const JIRA_EMAIL_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.emailTextFieldLabel',
  {
    defaultMessage: 'Email or Username',
  }
);

export const JIRA_EMAIL_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.requiredEmailTextField',
  {
    defaultMessage: 'Email or Username is required',
  }
);

export const JIRA_API_TOKEN_LABEL = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.apiTokenTextFieldLabel',
  {
    defaultMessage: 'API token or Password',
  }
);

export const JIRA_API_TOKEN_REQUIRED = i18n.translate(
  'xpack.securitySolution.case.connectors.jira.requiredApiTokenTextField',
  {
    defaultMessage: 'API token or Password is required',
  }
);

export const MAPPING_FIELD_SUMMARY = i18n.translate(
  'xpack.securitySolution.case.configureCases.mappingFieldSummary',
  {
    defaultMessage: 'Summary',
  }
);
