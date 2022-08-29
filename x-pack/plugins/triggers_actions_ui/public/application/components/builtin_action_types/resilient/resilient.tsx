/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { GenericValidationResult, ActionTypeModel } from '../../../../types';
import { ResilientConfig, ResilientSecrets, ResilientActionParams } from './types';

export const DESC = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.selectMessageText',
  {
    defaultMessage: 'Create an incident in IBM Resilient.',
  }
);

export const TITLE = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.resilient.actionTypeTitle',
  {
    defaultMessage: 'Resilient',
  }
);

export function getActionType(): ActionTypeModel<
  ResilientConfig,
  ResilientSecrets,
  ResilientActionParams
> {
  return {
    id: '.resilient',
    iconClass: lazy(() => import('./logo')),
    selectMessage: DESC,
    actionTypeTitle: TITLE,
    actionConnectorFields: lazy(() => import('./resilient_connectors')),
    validateParams: async (
      actionParams: ResilientActionParams
    ): Promise<GenericValidationResult<unknown>> => {
      const translations = await import('./translations');
      const errors = {
        'subActionParams.incident.name': new Array<string>(),
      };
      const validationResult = {
        errors,
      };
      if (
        actionParams.subActionParams &&
        actionParams.subActionParams.incident &&
        !actionParams.subActionParams.incident.name?.length
      ) {
        errors['subActionParams.incident.name'].push(translations.NAME_REQUIRED);
      }
      return validationResult;
    },
    actionParamsFields: lazy(() => import('./resilient_params')),
  };
}
