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
import { GenerativeAiActionParams, GenerativeAiConfig, GenerativeAiSecrets } from '../types';

export function getConnectorType(): ConnectorTypeModel<
  GenerativeAiConfig,
  GenerativeAiSecrets,
  GenerativeAiActionParams
> {
  return {
    id: '.gen-ai',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate('xpack.stackConnectors.components.genAi.selectMessageText', {
      defaultMessage: 'Send a request to Generative AI',
    }),
    actionTypeTitle: i18n.translate('xpack.stackConnectors.components.genAi.connectorTypeTitle', {
      defaultMessage: 'Generative AI data',
    }),
    validateParams: async (
      actionParams: GenerativeAiActionParams
    ): Promise<GenericValidationResult<GenerativeAiActionParams>> => {
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
