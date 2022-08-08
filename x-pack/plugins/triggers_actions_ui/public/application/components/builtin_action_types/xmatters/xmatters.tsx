/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, GenericValidationResult } from '../../../../types';
import { XmattersActionParams, XmattersConfig, XmattersSecrets } from '../types';

export function getActionType(): ActionTypeModel<
  XmattersConfig,
  XmattersSecrets,
  XmattersActionParams
> {
  return {
    id: '.xmatters',
    iconClass: lazy(() => import('./logo')),
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.selectMessageText',
      {
        defaultMessage: 'Trigger an xMatters workflow.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.xmattersAction.actionTypeTitle',
      {
        defaultMessage: 'xMatters data',
      }
    ),
    validateParams: async (
      actionParams: XmattersActionParams
    ): Promise<
      GenericValidationResult<Pick<XmattersActionParams, 'alertActionGroupName' | 'signalId'>>
    > => {
      const errors = {
        alertActionGroupName: new Array<string>(),
        signalId: new Array<string>(),
      };
      const validationResult = { errors };
      validationResult.errors = errors;
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./xmatters_connectors')),
    actionParamsFields: lazy(() => import('./xmatters_params')),
  };
}
