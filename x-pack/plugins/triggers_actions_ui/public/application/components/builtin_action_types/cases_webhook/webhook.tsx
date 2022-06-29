/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, GenericValidationResult } from '../../../../types';
import { CasesWebhookActionParams, CasesWebhookConfig, CasesWebhookSecrets } from './types';

export function getActionType(): ActionTypeModel<
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionParams
> {
  return {
    id: '.cases-webhook',
    // TODO: Steph/cases webhook get an icon
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.selectMessageText',
      {
        defaultMessage: 'Send a request to a Case Management web service.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.casesWebhookAction.actionTypeTitle',
      {
        defaultMessage: 'Cases Webhook data',
      }
    ),
    validateParams: async (
      actionParams: CasesWebhookActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.summary': new Array<string>(),
      };
      const validationResult = { errors };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.summary?.length
      ) {
        errors['subActionParams.incident.summary'].push(translations.SUMMARY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
