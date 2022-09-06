/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* istanbul ignore file */

import type {
  RuleAction,
  ActionTypeRegistryContract,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { ValidationFunc, ERROR_CODE, ValidationError } from '../../../../../shared_imports';
import { getActionTypeName, validateMustache, validateActionParams } from './utils';

export const validateSingleAction = async (
  actionItem: RuleAction,
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<string[]> => {
  const actionParamsErrors = await validateActionParams(actionItem, actionTypeRegistry);
  const mustacheErrors = validateMustache(actionItem.params);

  return [...actionParamsErrors, ...mustacheErrors];
};

export const validateRuleActionsField =
  (actionTypeRegistry: ActionTypeRegistryContract) =>
  async (
    ...data: Parameters<ValidationFunc>
  ): Promise<ValidationError<ERROR_CODE> | void | undefined> => {
    const [{ value, path }] = data as [{ value: RuleAction[]; path: string }];

    const errors = [];
    for (const actionItem of value) {
      const errorsArray = await validateSingleAction(actionItem, actionTypeRegistry);

      if (errorsArray.length) {
        const actionTypeName = getActionTypeName(actionItem.actionTypeId);
        const errorsListItems = errorsArray.map((error) => `*   ${error}\n`);

        errors.push(`\n**${actionTypeName}:**\n${errorsListItems.join('')}`);
      }
    }

    if (errors.length) {
      return {
        code: 'ERR_FIELD_FORMAT',
        path,
        message: `${errors.join('\n')}`,
      };
    }
  };
