/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import teamsSvg from './teams.svg';
import {
  ActionTypeModel,
  GenericValidationResult,
  ConnectorValidationResult,
} from '../../../../types';
import { TeamsActionParams, TeamsSecrets, TeamsActionConnector } from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<unknown, TeamsSecrets, TeamsActionParams> {
  return {
    id: '.teams',
    iconClass: teamsSvg,
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Microsoft Teams channel.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.actionTypeTitle',
      {
        defaultMessage: 'Send a message to a Microsoft Teams channel.',
      }
    ),
    validateConnector: (
      action: TeamsActionConnector
    ): ConnectorValidationResult<unknown, TeamsSecrets> => {
      const secretsErrors = {
        webhookUrl: new Array<string>(),
      };
      const validationResult = { config: { errors: {} }, secrets: { errors: secretsErrors } };
      if (!action.secrets.webhookUrl) {
        secretsErrors.webhookUrl.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'Webhook URL is required.',
            }
          )
        );
      } else if (action.secrets.webhookUrl) {
        if (!isValidUrl(action.secrets.webhookUrl)) {
          secretsErrors.webhookUrl.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.error.invalidWebhookUrlText',
              {
                defaultMessage: 'Webhook URL is invalid.',
              }
            )
          );
        } else if (!isValidUrl(action.secrets.webhookUrl, 'https:')) {
          secretsErrors.webhookUrl.push(
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
    validateParams: (
      actionParams: TeamsActionParams
    ): GenericValidationResult<TeamsActionParams> => {
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
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
