/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, GenericValidationResult } from '../../../../types';
import { TeamsActionParams, TeamsSecrets } from '../types';

export function getActionType(): ActionTypeModel<unknown, TeamsSecrets, TeamsActionParams> {
  return {
    id: '.teams',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.selectMessageText',
      {
        defaultMessage: 'Send a message to a Microsoft Teams channel.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.teamsAction.actionTypeTitle',
      {
        defaultMessage: 'Send a message to a Microsoft Teams channel.',
      }
    ),
    validateParams: async (
      actionParams: TeamsActionParams
    ): Promise<GenericValidationResult<TeamsActionParams>> => {
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
    actionConnectorFields: lazy(() => import('./teams_connectors')),
    actionParamsFields: lazy(() => import('./teams_params')),
  };
}
