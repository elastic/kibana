/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import { i18n } from '@kbn/i18n';

import {
  AlertAction,
  ActionTypeRegistryContract,
} from '../../../../../../triggers_actions_ui/public';
import { FormSchema, ValidationFunc, ERROR_CODE } from '../../../../shared_imports';
import { ActionsStepRule } from '../../../pages/detection_engine/rules/types';
import * as I18n from './translations';
import { isUuid, getActionTypeName, validateMustache, validateActionParams } from './utils';

export const validateSingleAction = (
  actionItem: AlertAction,
  actionTypeRegistry: ActionTypeRegistryContract
): string[] => {
  if (!isUuid(actionItem.id)) {
    return [I18n.NO_CONNECTOR_SELECTED];
  }

  const actionParamsErrors = validateActionParams(actionItem, actionTypeRegistry);
  const mustacheErrors = validateMustache(actionItem.params);

  return [...actionParamsErrors, ...mustacheErrors];
};

export const validateRuleActionsField = (actionTypeRegistry: ActionTypeRegistryContract) => (
  ...data: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
  const [{ value, path }] = data as [{ value: AlertAction[]; path: string }];

  const errors = value.reduce((acc, actionItem) => {
    const errorsArray = validateSingleAction(actionItem, actionTypeRegistry);

    if (errorsArray.length) {
      const actionTypeName = getActionTypeName(actionItem.actionTypeId);
      const errorsListItems = errorsArray.map((error) => `*   ${error}\n`);

      return [...acc, `\n**${actionTypeName}:**\n${errorsListItems.join('')}`];
    }

    return acc;
  }, [] as string[]);

  if (errors.length) {
    return {
      code: 'ERR_FIELD_FORMAT',
      path,
      message: `${errors.join('\n')}`,
    };
  }
};

export const getSchema = ({
  actionTypeRegistry,
}: {
  actionTypeRegistry: ActionTypeRegistryContract;
}): FormSchema<ActionsStepRule> => ({
  actions: {
    validations: [
      {
        validator: validateRuleActionsField(actionTypeRegistry),
      },
    ],
  },
  enabled: {},
  kibanaSiemAppUrl: {},
  throttle: {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.fieldThrottleLabel',
      {
        defaultMessage: 'Actions frequency',
      }
    ),
    helpText: i18n.translate(
      'xpack.securitySolution.detectionEngine.createRule.stepRuleActions.fieldThrottleHelpText',
      {
        defaultMessage:
          'Select when automated actions should be performed if a rule evaluates as true.',
      }
    ),
  },
});
