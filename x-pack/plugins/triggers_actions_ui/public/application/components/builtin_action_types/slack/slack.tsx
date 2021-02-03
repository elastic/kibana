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
import { SlackActionParams, SlackSecrets, SlackActionConnector } from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<unknown, SlackSecrets, SlackActionParams> {
  return {
    id: '.slack',
    iconClass: 'logoSlack',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Slack channel or user.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.actionTypeTitle',
      {
        defaultMessage: 'Send to Slack',
      }
    ),
    validateConnector: (
      action: SlackActionConnector
    ): ConnectorValidationResult<unknown, SlackSecrets> => {
      const secretsErrors = {
        webhookUrl: new Array<string>(),
      };
      const validationResult = { config: { errors: {} }, secrets: { errors: secretsErrors } };
      if (!action.secrets.webhookUrl) {
        secretsErrors.webhookUrl.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'Webhook URL is required.',
            }
          )
        );
      } else if (action.secrets.webhookUrl) {
        if (!isValidUrl(action.secrets.webhookUrl)) {
          secretsErrors.webhookUrl.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.invalidWebhookUrlText',
              {
                defaultMessage: 'Webhook URL is invalid.',
              }
            )
          );
        } else if (!isValidUrl(action.secrets.webhookUrl, 'https:')) {
          secretsErrors.webhookUrl.push(
            i18n.translate(
              'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requireHttpsWebhookUrlText',
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
      actionParams: SlackActionParams
    ): GenericValidationResult<SlackActionParams> => {
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.message?.length) {
        errors.message.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSlackMessageText',
            {
              defaultMessage: 'Message is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./slack_connectors')),
    actionParamsFields: lazy(() => import('./slack_params')),
  };
}
