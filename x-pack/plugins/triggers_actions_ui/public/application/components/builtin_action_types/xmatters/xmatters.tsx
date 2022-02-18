/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ActionTypeModel,
  GenericValidationResult,
  ConnectorValidationResult,
} from '../../../../types';
import {
  XmattersActionParams,
  XmattersConfig,
  XmattersSecrets,
  XmattersActionConnector,
} from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<
  XmattersConfig,
  XmattersSecrets,
  XmattersActionParams
> {
  return {
    id: '.xmatters',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.selectMessageText',
      {
        defaultMessage: 'Send a request to xMatters.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.actionTypeTitle',
      {
        defaultMessage: 'xMatters data',
      }
    ),
    validateConnector: async (
      action: XmattersActionConnector
    ): Promise<ConnectorValidationResult<Pick<XmattersConfig, 'urlConfig'>, XmattersSecrets>> => {
      const translations = await import('./translations');
      const configErrors = {
        urlConfig: new Array<string>(),
      };
      const secretsErrors = {
        user: new Array<string>(),
        password: new Array<string>(),
        urlSecrets: new Array<string>(),
      };
      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };
      // basic auth validation
      if (!action.config.urlConfig && action.config.usesBasic) {
        configErrors.urlConfig.push(translations.URL_REQUIRED);
      }
      if (action.config.usesBasic && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.config.urlConfig && !isValidUrl(action.config.urlConfig)) {
        configErrors.urlConfig = [...configErrors.urlConfig, translations.URL_INVALID];
      }
      if (action.config.usesBasic && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.config.usesBasic && action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED_FOR_USER);
      }
      if (action.config.usesBasic && !action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED_FOR_PASSWORD);
      }
      // API Key auth validation
      if (!action.config.usesBasic && !action.secrets.urlSecrets) {
        secretsErrors.urlSecrets.push(translations.URL_REQUIRED);
      }
      if (action.secrets.urlSecrets && !isValidUrl(action.secrets.urlSecrets)) {
        secretsErrors.urlSecrets.push(translations.URL_INVALID);
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: XmattersActionParams
    ): Promise<
      GenericValidationResult<Pick<XmattersActionParams, 'alertActionGroupName' | 'signalId'>>
    > => {
      const errors = {
        alertActionGroupName: new Array<string>(),
        signalId: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./xmatters_connectors')),
    actionParamsFields: lazy(() => import('./xmatters_params')),
  };
}
