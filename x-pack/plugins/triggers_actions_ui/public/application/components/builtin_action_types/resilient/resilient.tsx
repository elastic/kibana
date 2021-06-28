/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  GenericValidationResult,
  ActionTypeModel,
  ConnectorValidationResult,
} from '../../../../types';
import {
  ResilientActionConnector,
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams,
} from './types';
import { isValidUrl } from '../../../lib/value_validators';

const validateConnector = async (
  action: ResilientActionConnector
): Promise<ConnectorValidationResult<ResilientConfig, ResilientSecrets>> => {
  const translations = await import('./translations');
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
    configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_REQUIRED];
  }

  if (action.config.apiUrl) {
    if (!isValidUrl(action.config.apiUrl)) {
      configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_INVALID];
    } else if (!isValidUrl(action.config.apiUrl, 'https:')) {
      configErrors.apiUrl = [...configErrors.apiUrl, translations.API_URL_REQUIRE_HTTPS];
    }
  }

  if (!action.config.orgId) {
    configErrors.orgId = [...configErrors.orgId, translations.ORG_ID_REQUIRED];
  }

  if (!action.secrets.apiKeyId) {
    secretsErrors.apiKeyId = [...secretsErrors.apiKeyId, translations.API_KEY_ID_REQUIRED];
  }

  if (!action.secrets.apiKeySecret) {
    secretsErrors.apiKeySecret = [
      ...secretsErrors.apiKeySecret,
      translations.API_KEY_SECRET_REQUIRED,
    ];
  }

  return validationResult;
};

export const DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.selectMessageText',
  {
    defaultMessage: 'Create an incident in IBM Resilient.',
  }
);

export const TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.actionTypeTitle',
  {
    defaultMessage: 'Resilient',
  }
);

export function getActionType(): ActionTypeModel<
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams
> {
  return {
    id: '.resilient',
    iconClass: lazy(() => import('./logo')),
    selectMessage: DESC,
    actionTypeTitle: TITLE,
    validateConnector,
    actionConnectorFields: lazy(() => import('./resilient_connectors')),
    validateParams: async (
      actionParams: ResilientActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
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
        errors['subActionParams.incident.name'].push(translations.NAME_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./resilient_params')),
  };
}
