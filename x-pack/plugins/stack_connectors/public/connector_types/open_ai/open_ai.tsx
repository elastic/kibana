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
import { OpenAiActionParams, OpenAiConfig, OpenAiSecrets } from '../types';

export function getConnectorType(): ConnectorTypeModel<
  OpenAiConfig,
  OpenAiSecrets,
  OpenAiActionParams
> {
  return {
    id: '.openAi',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.openAi.selectMessageText', {
      defaultMessage: 'Send a request to Open AI',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.openAi.connectorTypeTitle', {
      defaultMessage: 'Open AI data',
    }),
    validateParams: async (
      actionParams: OpenAiActionParams
    ): Promise<GenericValidationResult<OpenAiActionParams>> => {
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
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
