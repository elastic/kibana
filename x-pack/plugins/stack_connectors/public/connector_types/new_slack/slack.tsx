/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  GenericValidationResult,
  ActionTypeModel as ConnectorTypeModel,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SlackSecrets, SlackActionParams } from './types';

export const SLACK_DESC = i18n.translate(
  'xpack.stackConnectors.components.slack.selectMessageText',
  {
    defaultMessage: 'Send a message to a Slack channel or user.',
  }
);

export const SLACK_TITLE = i18n.translate(
  'xpack.stackConnectors.components.slack.connectorTypeTitle',
  {
    defaultMessage: 'Send to Slack',
  }
);

export function getConnectorType(): ConnectorTypeModel<
  {},
  SlackSecrets,
  SlackActionParams['subActionParams']
> {
  return {
    id: '.new_slack',
    iconClass: 'logoSlack',
    selectMessage: SLACK_DESC,
    actionTypeTitle: SLACK_TITLE,
    actionConnectorFields: lazy(() => import('./slack_connectors')),
    actionParamsFields: lazy(() => import('./slack_params')),
    validateParams: async (
      actionParams: SlackActionParams['subActionParams']
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.postMessage.channel': new Array<string>(),
        'subActionParams.postMessage.text': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (!actionParams.channel?.length) {
        errors['subActionParams.postMessage.text'].push(translations.CHANNEL_REQUIRED);
      }

      if (!actionParams?.text?.length) {
        errors['subActionParams.postMessage.text'].push(translations.MESSAGE_REQUIRED);
      }
      return validationResult;
    },
  };
}
