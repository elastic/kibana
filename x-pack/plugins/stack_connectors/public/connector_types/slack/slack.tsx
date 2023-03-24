/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  ActionTypeModel as ConnectorTypeModel,
  GenericValidationResult,
} from '@kbn/triggers-actions-ui-plugin/public/types';
import { SLACK_CONNECTOR_ID } from '../../../common/slack/constants';
import type {
  SlackActionParams,
  SlackSecrets,
  WebhookParams,
  PostMessageParams,
} from '../../../common/slack/types';

export function getConnectorType(): ConnectorTypeModel<
  unknown,
  SlackSecrets,
  WebhookParams | PostMessageParams
> {
  return {
    id: SLACK_CONNECTOR_ID,
    iconClass: 'logoSlack',
    selectMessage: i18n.translate('xpack.stackConnectors.components.slack.selectMessageText', {
      defaultMessage: 'Send a message to a Slack channel or user.',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.slack.connectorTypeTitle', {
      defaultMessage: 'Send to Slack',
    }),
    validateParams: async (
      actionParams: SlackActionParams
    ): Promise<GenericValidationResult<SlackActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        message: new Array<string>(),
        'subActionParams.channels': new Array<string>(),
      };
      const validationResult = { errors };

      if ('subAction' in actionParams) {
        if (actionParams.subAction === 'postMessage') {
          if (!actionParams.subActionParams.text) {
            errors.message.push(translations.MESSAGE_REQUIRED);
          }
          if (!actionParams.subActionParams.channels?.length) {
            errors['subActionParams.channels'].push(translations.CHANNEL_REQUIRED);
          }
        }
      } else {
        if (!actionParams.message) {
          errors.message.push(translations.MESSAGE_REQUIRED);
        }
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./slack_connectors')),
    actionParamsFields: lazy(() => import('./slack_params')),
    resetParamsOnConnectorChange: (
      params: WebhookParams | PostMessageParams
    ): WebhookParams | PostMessageParams | {} => {
      if ('message' in params) {
        return {
          subAction: 'postMessage',
          subActionParams: {
            channels: [],
            text: params.message,
          },
        };
      } else if ('subAction' in params) {
        return {
          message: (params as PostMessageParams).subActionParams.text,
        };
      }
      return {};
    },
  };
}
