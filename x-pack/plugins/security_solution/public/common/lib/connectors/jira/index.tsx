/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import {
  ValidationResult,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../../../triggers_actions_ui/public/types';

import { connector } from './config';
import { createActionType } from '../utils';
import logo from './logo.svg';
import { JiraActionConnector } from './types';
import * as i18n from './translations';

interface Errors {
  projectKey: string[];
  email: string[];
  apiToken: string[];
}

const validateConnector = (action: JiraActionConnector): ValidationResult => {
  const errors: Errors = {
    projectKey: [],
    email: [],
    apiToken: [],
  };

  if (!action.config.projectKey) {
    errors.projectKey = [...errors.projectKey, i18n.JIRA_PROJECT_KEY_REQUIRED];
  }

  if (!action.secrets.email) {
    errors.email = [...errors.email, i18n.JIRA_EMAIL_REQUIRED];
  }

  if (!action.secrets.apiToken) {
    errors.apiToken = [...errors.apiToken, i18n.JIRA_API_TOKEN_REQUIRED];
  }

  return { errors };
};

export const getActionType = createActionType({
  id: connector.id,
  iconClass: logo,
  selectMessage: i18n.JIRA_DESC,
  actionTypeTitle: connector.name,
  validateConnector,
  actionConnectorFields: lazy(() => import('./flyout')),
});
