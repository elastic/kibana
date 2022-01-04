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
    id: 'xmatters',
    iconClass: 'logoXmatters',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.selectMessageText',
      {
        defaultMessage: 'Send a request to the xMatters API.',
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
    ): Promise<ConnectorValidationResult<Pick<XmattersConfig, 'url'>, XmattersSecrets>> => {
      const translations = await import('./translations');
      const configErrors = {
        url: new Array<string>(),
        method: new Array<string>(),
      };
      const secretsErrors = {
        user: new Array<string>(),
        password: new Array<string>(),
      };
      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };
      if (!action.config.url) {
        configErrors.url.push(translations.URL_REQUIRED);
      }
      if (action.config.url && !isValidUrl(action.config.url)) {
        configErrors.url = [...configErrors.url, translations.URL_INVALID];
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED_FOR_USER);
      }
      if (!action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED_FOR_PASSWORD);
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: XmattersActionParams
    ): Promise<
      GenericValidationResult<Pick<XmattersActionParams, 'alertActionGroupName' | 'alertId'>>
    > => {
      const translations = await import('./translations');
      const errors = {
        alertActionGroupName: new Array<string>(),
        alertId: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.alertActionGroupName?.length) {
        errors.alertActionGroupName.push(translations.ALERT_ACTION_GROUP_NAME_REQUIRED);
      }
      if (!actionParams.alertId?.length) {
        errors.alertId.push(translations.ALERT_ID_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./xmatters_connectors')),
    actionParamsFields: lazy(() => import('./xmatters_params')),
  };
}
