/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import mustache from 'mustache';
import { uniq, startCase, flattenDeep, isArray, isString } from 'lodash/fp';

import {
  RuleAction,
  ActionTypeRegistryContract,
} from '../../../../../../triggers_actions_ui/public';
import * as I18n from './translations';

export const getActionTypeName = (actionTypeId: RuleAction['actionTypeId']) => {
  if (!actionTypeId) return '';
  const actionType = actionTypeId.split('.')[1];

  if (!actionType) return '';

  return startCase(actionType);
};

export const validateMustache = (params: RuleAction['params']) => {
  const errors: string[] = [];
  Object.entries(params).forEach(([paramKey, paramValue]) => {
    if (!isString(paramValue)) return;
    try {
      mustache.render(paramValue, {});
    } catch (e) {
      errors.push(I18n.INVALID_MUSTACHE_TEMPLATE(paramKey));
    }
  });

  return errors;
};

export const validateActionParams = async (
  actionItem: RuleAction,
  actionTypeRegistry: ActionTypeRegistryContract
): Promise<string[]> => {
  const actionErrors = await actionTypeRegistry
    .get(actionItem.actionTypeId)
    ?.validateParams(actionItem.params);

  if (actionErrors) {
    const actionErrorsValues = Object.values(actionErrors.errors);

    if (actionErrorsValues.length) {
      const filteredObjects: Array<string | string[]> = actionErrorsValues.filter(
        (item) => isString(item) || isArray(item)
      ) as Array<string | string[]>;
      const uniqActionErrors = uniq(flattenDeep(filteredObjects));

      if (uniqActionErrors.length) {
        return uniqActionErrors;
      }
    }
  }

  return [];
};
