/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import {
  GenericValidationResult,
  ActionTypeModel,
  ConnectorValidationResult,
} from '../../../../types';
import logo from './logo.svg';
import { JiraActionConnector, JiraConfig, JiraSecrets, JiraActionParams } from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = (
  action: JiraActionConnector
): ConnectorValidationResult<JiraConfig, JiraSecrets> => {
  const configErrors = {
    apiUrl: new Array<string>(),
    projectKey: new Array<string>(),
  };
  const secretsErrors = {
    email: new Array<string>(),
    apiToken: new Array<string>(),
  };

  const validationResult = {
    config: { errors: configErrors },
    secrets: { errors: secretsErrors },
  };

  if (!action.config.apiUrl) {
    configErrors.apiUrl = [...configErrors.apiUrl, i18n.API_URL_REQUIRED];
  }

  if (action.config.apiUrl) {
    if (!isValidUrl(action.config.apiUrl)) {
      configErrors.apiUrl = [...configErrors.apiUrl, i18n.API_URL_INVALID];
    } else if (!isValidUrl(action.config.apiUrl, 'https:')) {
      configErrors.apiUrl = [...configErrors.apiUrl, i18n.API_URL_REQUIRE_HTTPS];
    }
  }

  if (!action.config.projectKey) {
    configErrors.projectKey = [...configErrors.projectKey, i18n.JIRA_PROJECT_KEY_REQUIRED];
  }

  if (!action.secrets.email) {
    secretsErrors.email = [...secretsErrors.email, i18n.JIRA_EMAIL_REQUIRED];
  }

  if (!action.secrets.apiToken) {
    secretsErrors.apiToken = [...secretsErrors.apiToken, i18n.JIRA_API_TOKEN_REQUIRED];
  }

  return validationResult;
};

export function getActionType(): ActionTypeModel<JiraConfig, JiraSecrets, JiraActionParams> {
  return {
    id: '.jira',
    iconClass: logo,
    selectMessage: i18n.JIRA_DESC,
    actionTypeTitle: i18n.JIRA_TITLE,
    validateConnector,
    actionConnectorFields: lazy(() => import('./jira_connectors')),
    validateParams: (actionParams: JiraActionParams): GenericValidationResult<unknown> => {
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
        'subActionParams.incident.labels': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.summary?.length
      ) {
        errors['subActionParams.incident.summary'].push(i18n.SUMMARY_REQUIRED);
      }

      if (actionParams.subActionParams?.incident?.labels?.length) {
        // Jira do not allows empty spaces on labels. If the label includes a whitespace show an error.
        if (actionParams.subActionParams.incident.labels.some((label) => label.match(/\s/g)))
          errors['subActionParams.incident.labels'].push(i18n.LABELS_WHITE_SPACES);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./jira_params')),
  };
}
