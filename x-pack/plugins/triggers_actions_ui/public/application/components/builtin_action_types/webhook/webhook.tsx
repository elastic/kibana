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
  WebhookActionParams,
  WebhookConfig,
  WebhookSecrets,
  WebhookActionConnector,
} from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<
  WebhookConfig,
  WebhookSecrets,
  WebhookActionParams
> {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a web service.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.actionTypeTitle',
      {
        defaultMessage: 'Webhook data',
      }
    ),
    validateConnector: async (
      action: WebhookActionConnector
    ): Promise<
      ConnectorValidationResult<Pick<WebhookConfig, 'url' | 'method'>, WebhookSecrets>
    > => {
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
      if (!action.config.method) {
        configErrors.method.push(translations.METHOD_REQUIRED);
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
      actionParams: WebhookActionParams
    ): Promise<GenericValidationResult<WebhookActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        body: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(translations.BODY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
