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
  ResilientActionConnector,
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams,
} from './types';
import * as i18n from './translations';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = (
  action: ResilientActionConnector
): ConnectorValidationResult<ResilientConfig, ResilientSecrets> => {
  const configErrors = {
    apiUrl: new Array<string>(),
    orgId: new Array<string>(),
  };
  const secretsErrors = {
    apiKeyId: new Array<string>(),
    apiKeySecret: new Array<string>(),
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

  if (!action.config.orgId) {
    configErrors.orgId = [...configErrors.orgId, i18n.ORG_ID_REQUIRED];
  }

  if (!action.secrets.apiKeyId) {
    secretsErrors.apiKeyId = [...secretsErrors.apiKeyId, i18n.API_KEY_ID_REQUIRED];
  }

  if (!action.secrets.apiKeySecret) {
    secretsErrors.apiKeySecret = [...secretsErrors.apiKeySecret, i18n.API_KEY_SECRET_REQUIRED];
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
    validateParams: (actionParams: ResilientActionParams): GenericValidationResult<unknown> => {
      const errors = {
        'subActionParams.incident.name': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.name?.length
      ) {
        errors['subActionParams.incident.name'].push(i18n.NAME_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./resilient_params')),
  };
}
