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

export function getConnectorType(): ConnectorTypeModel<unknown, SlackSecrets, SlackActionParams> {
  return {
    id: '.slack',
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
