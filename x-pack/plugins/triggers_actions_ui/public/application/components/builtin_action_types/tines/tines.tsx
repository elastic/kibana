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
import { TinesActionConnector, TinesConfig, TinesParams, TinesSecrets } from './types';

export function getActionType(): ActionTypeModel<TinesConfig, TinesSecrets, TinesParams> {
  return {
    id: '.tines',
    iconClass: 'agentApp',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.tines.selectMessageText',
      {
        defaultMessage: 'Trigger an action on Tines.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.tines.actionTypeTitle',
      {
        defaultMessage: 'Send to Tines',
      }
    ),
    validateConnector: async (
      action: TinesActionConnector
    ): Promise<ConnectorValidationResult<TinesConfig, TinesSecrets>> => {
      return { config: { errors: { url: [] } }, secrets: { errors: { email: [], apiToken: [] } } };
    },
    validateParams: async (
      actionParams: TinesParams
    ): Promise<GenericValidationResult<TinesParams>> => {
      return { errors: { storyId: [], actionId: [] } };
    },
    actionConnectorFields: lazy(() => import('./connector')),
    actionParamsFields: lazy(() => import('./params')),
  };
}
