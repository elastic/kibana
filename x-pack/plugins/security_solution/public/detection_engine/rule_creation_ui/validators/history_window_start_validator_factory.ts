/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FieldHook } from '../../../shared_imports';
import { type ERROR_CODE, type ValidationFunc } from '../../../shared_imports';

export function historyWindowStartValidationFactory(
  ...args: Parameters<ValidationFunc>
): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined {
  const [{ path, form }] = args;

  const field = form.getFields()[path] as FieldHook<string> | undefined;
  const value = field?.value ?? '';

  const numberMatchResult = value.match(/\d+/g);

  if (numberMatchResult === null) {
    return {
      code: 'ERR_NOT_INT_NUMBER',
      path,
      message: i18n.translate(
        'xpack.securitySolution.detectionEngine.validations.stepDefineRule.historyWindowSize.errNumber',
        {
          defaultMessage: 'History window size must be a positive number.',
        }
      ),
    };
  }

  const numericValue = parseInt(numberMatchResult[0], 10);

  if (numericValue <= 0) {
    return {
      code: 'ERR_MIN_LENGTH',
      path,
      message: i18n.translate(
        'xpack.securitySolution.detectionEngine.validations.stepDefineRule.historyWindowSize.errMin',
        {
          defaultMessage: 'History window size must be greater than 0.',
        }
      ),
    };
  }
}
