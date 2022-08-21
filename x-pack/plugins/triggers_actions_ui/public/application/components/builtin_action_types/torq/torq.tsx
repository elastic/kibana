/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, GenericValidationResult } from '../../../../types';
import { TorqActionParams, TorqConfig, TorqSecrets } from '../types';

export function getActionType(): ActionTypeModel<
  TorqConfig,
  TorqSecrets,
  TorqActionParams
> {
  return {
    id: '.torq',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.torqAction.selectMessageText',
      {
        defaultMessage: 'Trigger a Torq workflow.', // TODO: add translations
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.torqAction.actionTypeTitle',
      {
        defaultMessage: 'Alert data', // TODO: add translations
      }
    ),
    validateParams: async (
      actionParams: TorqActionParams
    ): Promise<GenericValidationResult<TorqActionParams>> => {
      const translations = await import('./translations');
      const errors = {
        body: [] as Array<String>,
      }; // TODO: consider adding validations
      const validationResult = { errors };
      validationResult.errors = errors;
      if (!actionParams.body?.length) {
        errors.body.push(translations.BODY_REQUIRED);
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./torq_connectors')),
    actionParamsFields: lazy(() => import('./torq_params')),
  };
}
