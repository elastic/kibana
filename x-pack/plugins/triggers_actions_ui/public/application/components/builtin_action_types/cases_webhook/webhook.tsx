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
import {
  CasesWebhookActionParams,
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionConnector,
} from '../types';
import { isValidUrl } from '../../../lib/value_validators';

export function getActionType(): ActionTypeModel<
  CasesWebhookConfig,
  CasesWebhookSecrets,
  CasesWebhookActionParams
> {
  return {
    id: '.cases-webhook',
    // TODO: Steph/cases webhook get an icon
    iconClass: 'indexManagementApp',
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
    validateConnector: async (
      action: CasesWebhookActionConnector
    ): Promise<
      ConnectorValidationResult<Pick<CasesWebhookConfig, 'url' | 'method'>, CasesWebhookSecrets>
    > => {
      const translations = await import('./translations');
      const configErrors = {
        url: new Array<string>(),
        method: new Array<string>(),
      };
      const secretsErrors = {
        user: new Array<string>(),
        password: new Array<string>(),
      };
      const validationResult = {
        config: { errors: configErrors },
        secrets: { errors: secretsErrors },
      };
      if (!action.config.url) {
        configErrors.url.push(translations.URL_REQUIRED);
      }
      if (action.config.url && !isValidUrl(action.config.url)) {
        configErrors.url = [...configErrors.url, translations.URL_INVALID];
      }
      if (!action.config.method) {
        configErrors.method.push(translations.METHOD_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED);
      }
      if (action.config.hasAuth && !action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED);
      }
      if (action.secrets.user && !action.secrets.password) {
        secretsErrors.password.push(translations.PASSWORD_REQUIRED_FOR_USER);
      }
      if (!action.secrets.user && action.secrets.password) {
        secretsErrors.user.push(translations.USERNAME_REQUIRED_FOR_PASSWORD);
      }
      return validationResult;
    },
    validateParams: async (
      actionParams: CasesWebhookActionParams
    ): Promise<GenericValidationResult<CasesWebhookActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        body: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(translations.BODY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./webhook_connectors')),
    actionParamsFields: lazy(() => import('./webhook_params')),
  };
}
