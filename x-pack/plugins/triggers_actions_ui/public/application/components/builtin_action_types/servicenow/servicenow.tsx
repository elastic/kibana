/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { ValidationResult, ActionTypeModel } from '../../../../types';
import { connectorConfiguration } from './config';
import logo from './logo.svg';
import { ServiceNowActionConnector, ServiceNowActionParams } from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = (action: ServiceNowActionConnector): ValidationResult => {
  const validationResult = { errors: {} };
  const errors = {
    apiUrl: new Array<string>(),
    username: new Array<string>(),
    password: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!action.config.apiUrl) {
    errors.apiUrl = [...errors.apiUrl, i18n.API_URL_REQUIRED];
  }

  if (action.config.apiUrl && !isValidUrl(action.config.apiUrl, 'https:')) {
    errors.apiUrl = [...errors.apiUrl, i18n.API_URL_INVALID];
  }

  if (!action.secrets.username) {
    errors.username = [...errors.username, i18n.USERNAME_REQUIRED];
  }

  if (!action.secrets.password) {
    errors.password = [...errors.password, i18n.PASSWORD_REQUIRED];
  }

  return validationResult;
};

export function getActionType(): ActionTypeModel<
  ServiceNowActionConnector,
  ServiceNowActionParams
> {
  return {
    id: connectorConfiguration.id,
    iconClass: logo,
    selectMessage: i18n.SERVICENOW_DESC,
    actionTypeTitle: connectorConfiguration.name,
    validateConnector,
    actionConnectorFields: lazy(() => import('./servicenow_connectors')),
    validateParams: (actionParams: ServiceNowActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        title: new Array<string>(),
      };
      validationResult.errors = errors;
      if (actionParams.subActionParams && !actionParams.subActionParams.title?.length) {
        errors.title.push(i18n.TITLE_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./servicenow_params')),
  };
}
