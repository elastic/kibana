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
import { WebhookActionParams, WebhookConfig, WebhookSecrets } from '../types';

export function getConnectorType(): ConnectorTypeModel<
  WebhookConfig,
  WebhookSecrets,
  WebhookActionParams
> {
  return {
    id: '.webhook',
    iconClass: 'logoWebhook',
    selectMessage: i18n.translate('xpack.stackConnectors.components.webhook.selectMessageText', {
      defaultMessage: 'Send a request to a web service.',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.webhook.connectorTypeTitle', {
      defaultMessage: 'Webhook data',
    }),
    validateParams: async (
      actionParams: WebhookActionParams
    ): Promise<GenericValidationResult<WebhookActionParams>> => {
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
