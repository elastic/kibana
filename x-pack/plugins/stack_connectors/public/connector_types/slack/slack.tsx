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
import { SlackActionParams, SlackSecrets } from '../types';
import { PostMessageParams } from '../../../common/slack_api/types';

export const subtype = [
  {
    id: '.slack',
    name: i18n.translate('xpack.stackConnectors.components.slack.webhook', {
      defaultMessage: 'Webhook',
    }),
  },
  {
    id: '.slack_api',
    name: i18n.translate('xpack.stackConnectors.components.slack.webApi', {
      defaultMessage: 'Web API',
    }),
  },
];

export function getConnectorType(): ConnectorTypeModel<unknown, SlackSecrets, SlackActionParams> {
  return {
    id: '.slack',
    subtype,
    modalWidth: 675,
    iconClass: 'logoSlack',
    selectMessage: i18n.translate('xpack.stackConnectors.components.slack.selectMessageText', {
      defaultMessage: 'Send messages to Slack channels.',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.slack.connectorTypeTitle', {
      defaultMessage: 'Slack',
    }),
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
    convertParamsBetweenGroups: (
      params: PostMessageParams | SlackActionParams
    ): PostMessageParams | SlackActionParams | {} => {
      if ('message' in params) {
        return params;
      } else if ('subAction' in params) {
        return {
          message: (params as PostMessageParams).subActionParams.text,
        };
      }
      return {};
    },
  };
}
