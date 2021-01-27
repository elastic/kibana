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
import {
  ServiceNowActionConnector,
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowActionParams,
} from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = (
  action: ServiceNowActionConnector
): ConnectorValidationResult<ServiceNowConfig, ServiceNowSecrets> => {
  const configErrors = {
    apiUrl: new Array<string>(),
  };
  const secretsErrors = {
    username: new Array<string>(),
    password: new Array<string>(),
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

  if (!action.secrets.username) {
    secretsErrors.username = [...secretsErrors.username, i18n.USERNAME_REQUIRED];
  }

  if (!action.secrets.password) {
    secretsErrors.password = [...secretsErrors.password, i18n.PASSWORD_REQUIRED];
  }

  return validationResult;
};

export function getActionType(): ActionTypeModel<
  ServiceNowConfig,
  ServiceNowSecrets,
  ServiceNowActionParams
> {
  return {
    id: connectorConfiguration.id,
    iconClass: logo,
    selectMessage: i18n.SERVICENOW_DESC,
    actionTypeTitle: connectorConfiguration.name,
    validateConnector,
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: (actionParams: ServiceNowActionParams): GenericValidationResult<unknown> => {
      const errors = {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'subActionParams.incident.short_description': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.short_description?.length
      ) {
        errors['subActionParams.incident.short_description'].push(i18n.TITLE_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./servicenow_params')),
  };
}
