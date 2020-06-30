/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { WebhookActionParams, WebhookActionConnector } from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<WebhookActionConnector, WebhookActionParams> {
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
    validateConnector: (action: WebhookActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        url: new Array<string>(),
        method: new Array<string>(),
        user: new Array<string>(),
        password: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.url) {
        errors.url.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.requiredUrlText',
            {
              defaultMessage: 'URL is required.',
            }
          )
        );
      }
      if (action.config.url && !isValidUrl(action.config.url)) {
        errors.url = [
          ...errors.url,
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.webhookAction.error.invalidUrlTextField',
            {
              defaultMessage: 'URL is invalid.',
            }
          ),
        ];
      }
      if (!action.config.method) {
        errors.method.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredMethodText',
            {
              defaultMessage: 'Method is required.',
            }
          )
        );
      }
      if (!action.secrets.user && action.secrets.password) {
        errors.user.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredHostText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      if (!action.secrets.password && action.secrets.user) {
        errors.password.push(
          i18n.translate(
            'xpack.triggersActionsUI.sections.addAction.webhookAction.error.requiredPasswordText',
            {
              defaultMessage: 'Password is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: WebhookActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        body: new Array<string>(),
      };
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
