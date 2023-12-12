/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import { UserDefinedRuleParams } from './types';

export const validateExpression = (ruleParams: UserDefinedRuleParams): ValidationResult => {
  const { stringifiedUserCode, customContextVariables } = ruleParams;

  const validationResult = { errors: {} };
  const errors = {
    stringifiedUserCode: new Array<string>(),
    customContextVariables: new Array<string>(),
  };
  validationResult.errors = errors;

  if (!stringifiedUserCode) {
    errors.stringifiedUserCode.push(
      i18n.translate('xpack.stackAlerts.userDefined.error.stringifiedUserCodeRequired', {
        defaultMessage: 'User defined code is required.',
      })
    );
  }

  return validationResult;
};
