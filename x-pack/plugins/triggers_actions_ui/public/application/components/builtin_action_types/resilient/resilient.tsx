/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import {
  ValidationResult,
  ActionTypeModel,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../types';
import { connectorConfiguration } from './config';
import logo from './logo.svg';
import { ResilientActionConnector, ResilientActionParams } from './types';
import * as i18n from './translations';

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

  // if (isUrlInvalid(action.config.apiUrl)) {
  //   errors.apiUrl = [...errors.apiUrl, i18n.API_URL_INVALID];
  // }

  if (!action.config.orgId) {
    errors.orgId = [...errors.orgId, i18n.RESILIENT_PROJECT_KEY_LABEL];
  }

  if (!action.secrets.apiKeyId) {
    errors.apiKeyId = [...errors.apiKeyId, i18n.RESILIENT_API_KEY_ID_REQUIRED];
  }

  if (!action.secrets.apiKeySecret) {
    errors.apiKeySecret = [...errors.apiKeySecret, i18n.RESILIENT_API_KEY_SECRET_REQUIRED];
  }

  return validationResult;
};

export function getActionType(): ActionTypeModel<ResilientActionConnector, ResilientActionParams> {
  return {
    id: connectorConfiguration.id,
    iconClass: logo,
    selectMessage: i18n.RESILIENT_DESC,
    actionTypeTitle: connectorConfiguration.name,
    // minimumLicenseRequired: 'platinum',
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
