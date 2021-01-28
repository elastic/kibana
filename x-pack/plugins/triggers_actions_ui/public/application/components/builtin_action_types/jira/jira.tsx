/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import {
  GenericValidationResult,
  ActionTypeModel,
  ConnectorValidationResult,
} from '../../../../types';
import { connectorConfiguration } from './config';
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
    id: connectorConfiguration.id,
    iconClass: logo,
    selectMessage: i18n.JIRA_DESC,
    actionTypeTitle: connectorConfiguration.name,
    validateConnector,
    actionConnectorFields: lazy(() => import('./jira_connectors')),
    validateParams: (actionParams: JiraActionParams): GenericValidationResult<unknown> => {
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
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
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./jira_params')),
  };
}
