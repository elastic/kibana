/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { i18n } from '@kbn/i18n';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ActionTypeModel, ValidationResult } from '@kbn/triggers-actions-ui-plugin/public/types';

interface ExampleActionParams {
  message: string;
}

export const getActionType = (): ActionTypeModel => {
  console.log('actionTYpe');

  return {
    id: '.osquery',
    iconClass: 'logoOsquery',
    selectMessage: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.selectMessageText',
      {
        defaultMessage: 'Example Action is used to show how to create new action type UI.',
      }
    ),
    actionTypeTitle: i18n.translate(
      'xpack.triggersActionsUI.components.builtinActionTypes.exampleAction.actionTypeTitle',
      {
        defaultMessage: 'Example Action',
      }
    ),
    // @ts-expect-error update types
    validateConnector: (action): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        someConnectorField: new Array<string>(),
      };
      validationResult.errors = errors;
      if (!action.config.someConnectorField) {
        errors.someConnectorField.push(
          i18n.translate(
            'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredSomeConnectorFieldeText',
            {
              defaultMessage: 'SomeConnectorField is required.',
            }
          )
        );
      }

      return validationResult;
    },
    validateParams: (actionParams: ExampleActionParams): ValidationResult => {
      const validationResult = { errors: {} };
      const errors = {
        message: new Array<string>(),
      };
      validationResult.errors = errors;

      // if (!actionParams.message?.length) {
      //   errors.message.push(
      //     i18n.translate(
      //       'xpack.triggersActionsUI.components.builtinActionTypes.error.requiredExampleMessageText',
      //       {
      //         defaultMessage: 'Message is required.',
      //       }
      //     )
      //   );
      // }

      return validationResult;
    },
    actionConnectorFields: null,
    actionParamsFields: lazy(() => import('./example_params_fields')),
  };
};
