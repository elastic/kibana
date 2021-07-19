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
    validateConnector: async (
      action: SlackActionConnector
    ): Promise<ConnectorValidationResult<unknown, SlackSecrets>> => {
      const translations = await import('./translations');
      const secretsErrors = {
        webhookUrl: new Array<string>(),
      };
      const validationResult = { config: { errors: {} }, secrets: { errors: secretsErrors } };
      if (!action.secrets.webhookUrl) {
        secretsErrors.webhookUrl.push(translations.WEBHOOK_URL_REQUIRED);
      } else if (action.secrets.webhookUrl) {
        if (!isValidUrl(action.secrets.webhookUrl)) {
          secretsErrors.webhookUrl.push(translations.WEBHOOK_URL_INVALID);
        } else if (!isValidUrl(action.secrets.webhookUrl, 'https:')) {
          secretsErrors.webhookUrl.push(translations.WEBHOOK_URL_HTTP_INVALID);
        }
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: SlackActionParams
    ): Promise<GenericValidationResult<SlackActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        message: new Array<string>(),
      };
      const validationResult = { errors };
      if (!actionParams.message?.length) {
        errors.message.push(translations.MESSAGE_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./slack_connectors')),
    actionParamsFields: lazy(() => import('./slack_params')),
  };
}
