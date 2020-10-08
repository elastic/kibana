/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { ValidationResult, ActionTypeModel } from '../../../../types';
import { connectorConfiguration } from './config';
import logo from './logo.svg';
import {
  ResilientActionConnector,
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams,
} from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = (action: ResilientActionConnector): ValidationResult => {
  const validationResult = { errors: {} };
  const errors = {
    apiUrl: new Array<string>(),
    orgId: new Array<string>(),
    apiKeyId: new Array<string>(),
    apiKeySecret: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!action.config.apiUrl) {
    errors.apiUrl = [...errors.apiUrl, i18n.API_URL_REQUIRED];
  }

  if (action.config.apiUrl && !isValidUrl(action.config.apiUrl, 'https:')) {
    errors.apiUrl = [...errors.apiUrl, i18n.API_URL_INVALID];
  }

  if (!action.config.orgId) {
    errors.orgId = [...errors.orgId, i18n.ORG_ID_REQUIRED];
  }

  if (!action.secrets.apiKeyId) {
    errors.apiKeyId = [...errors.apiKeyId, i18n.API_KEY_ID_REQUIRED];
  }

  if (!action.secrets.apiKeySecret) {
    errors.apiKeySecret = [...errors.apiKeySecret, i18n.API_KEY_SECRET_REQUIRED];
  }

  return validationResult;
};

export function getActionType(): ActionTypeModel<
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams
> {
  return {
    id: connectorConfiguration.id,
    iconClass: logo,
    selectMessage: i18n.DESC,
    actionTypeTitle: connectorConfiguration.name,
    validateConnector,
    actionConnectorFields: lazy(() => import('./resilient_connectors')),
    validateParams: (actionParams: ResilientActionParams): ValidationResult => {
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
    actionParamsFields: lazy(() => import('./resilient_params')),
  };
}
