/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { TeamsActionParams, TeamsSecrets, TeamsActionConnector } from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<unknown, TeamsSecrets, TeamsActionParams> {
  return {
    id: '.teams',
    iconClass: 'logoWindows',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Microsoft teams channel.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Microsoft Teams',
      }
    ),
    validateConnector: (action: TeamsActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        webhookUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.webhookUrl) {
        errors.webhookUrl.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'Webhook URL is required.',
            }
          )
        );
      } else if (action.secrets.webhookUrl) {
        if (!isValidUrl(action.secrets.webhookUrl)) {
          errors.webhookUrl.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.invalidWebhookUrlText',
              {
                defaultMessage: 'Webhook URL is invalid.',
              }
            )
          );
        } else if (!isValidUrl(action.secrets.webhookUrl, 'https:')) {
          errors.webhookUrl.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.requireHttpsWebhookUrlText',
              {
                defaultMessage: 'Webhook URL must start with https://.',
              }
            )
          );
        }
      }
      return validationResult;
    },
    validateParams: (actionParams: TeamsActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.requiredMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./teams_connectors')),
    actionParamsFields: lazy(() => import('./teams_params')),
  };
}
