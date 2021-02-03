/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
    validateConnector: (
      action: WebhookActionConnector
    ): ConnectorValidationResult<Pick<WebhookConfig, 'url' | 'method'>, WebhookSecrets> => {
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
        configErrors.url.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.requiredUrlText',
            {
              defaultMessage: 'URL is required.',
            }
          )
        );
      }
      if (action.config.url && !isValidUrl(action.config.url)) {
        configErrors.url = [
          ...configErrors.url,
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.invalidUrlTextField',
            {
              defaultMessage: 'URL is invalid.',
            }
          ),
        ];
      }
      if (!action.config.method) {
        configErrors.method.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredMethodText',
            {
              defaultMessage: 'Method is required.',
            }
          )
        );
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredAuthUserNameText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredAuthPasswordText',
            {
              defaultMessage: 'Password is required.',
            }
          )
        );
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required when username is used.',
            }
          )
        );
      }
      if (!action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredUserText',
            {
              defaultMessage: 'Username is required when password is used.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (
      actionParams: WebhookActionParams
    ): GenericValidationResult<WebhookActionParams> => {
      const errors = {
        body: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredWebhookBodyText',
            {
              defaultMessage: 'Body is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
