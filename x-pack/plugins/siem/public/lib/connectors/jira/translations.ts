/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const JIRA_DESC = i18n.translate('xpack.siem.case.connectors.jira.selectMessageText', {
  defaultMessage: 'Push or update SIEM case data to a new issue in Jira',
});

export const JIRA_TITLE = i18n.translate('xpack.siem.case.connectors.jira.actionTypeTitle', {
  defaultMessage: 'Jira',
});

export const JIRA_PROJECT_KEY_LABEL = i18n.translate('xpack.siem.case.connectors.jira.projectKey', {
  defaultMessage: 'Project key',
});

export const JIRA_PROJECT_KEY_REQUIRED = i18n.translate(
  'xpack.siem.case.connectors.jira.requiredProjectKeyTextField',
  {
    defaultMessage: 'Project key is required',
  }
);
