/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import { SlackActionParams, SlackActionConnector } from '../types';

const SlackActionFields = lazy(() => import('./slack_connectors'));
const SlackParamsFields = lazy(() => import('./slack_params'));

export function getActionType(): ActionTypeModel {
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
    validateConnector: (action: SlackActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        webhookUrl: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.webhookUrl) {
        errors.webhookUrl.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.slackAction.error.requiredWebhookUrlText',
            {
              defaultMessage: 'Webhook URL is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: SlackActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;
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
    actionConnectorFields: (props: any) => (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <SlackActionFields {...props} />
      </Suspense>
    ),
    actionParamsFields: (props: any) => (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <SlackParamsFields {...props} />
      </Suspense>
    ),
  };
}
