/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
import { ActionTypeModel, ValidationResult } from '../../../../types';
import {
  SwimlaneActionConnector,
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams,
} from '../types';
import swimlaneSvg from './swimlane.svg';

export function getActionType(): ActionTypeModel<
  SwimlaneConfig,
  SwimlaneSecrets,
  SwimlaneActionParams
> {
  return {
    id: '.swimlane',
    iconClass: swimlaneSvg,
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.selectMessageText',
      {
        defaultMessage: 'Create record in Swimlane',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.actionTypeTitle',
      {
        defaultMessage: 'Create Swimlane Record',
      }
    ),
    validateConnector: (action: SwimlaneActionConnector): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        apiUrl: new Array<string>(),
        appId: new Array<string>(),
        username: new Array<string>(),
        apiToken: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.secrets.apiToken) {
        errors.apiToken.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredApiTokenText',
            {
              defaultMessage: 'An API token is required.',
            }
          )
        );
      }
      if (!action.config.appId) {
        errors.appId.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAppIdText',
            {
              defaultMessage: 'An AppId is required.',
            }
          )
        );
      }
      if (!action.config.username) {
        errors.username.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredUsernameText',
            {
              defaultMessage: 'Username is required.',
            }
          )
        );
      }
      return validationResult;
    },
    validateParams: (actionParams: SwimlaneActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        alertName: new Array<string>(),
        tags: new Array<string>(),
        comments: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!actionParams.alertName?.length) {
        errors.alertName.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.swimlaneAction.error.requiredAlertName',
            {
              defaultMessage: 'AlertName is required.',
            }
          )
        );
      }
      return validationResult;
    },
    actionConnectorFields: lazy(() => import('./swimlane_connectors')),
    actionParamsFields: lazy(() => import('./swimlane_params')),
  };
}
