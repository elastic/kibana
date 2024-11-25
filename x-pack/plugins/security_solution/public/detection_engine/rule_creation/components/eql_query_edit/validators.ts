/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldHook } from '../../../../shared_imports';
import { EQL_ERROR_CODES } from '../../../../common/hooks/eql/api';

export const getValidationResults = <T = unknown>(
  field: FieldHook<T>
): { isValid: boolean; message: string; messages?: string[]; error?: Error } => {
  const hasErrors = field.errors.length > 0;
  const isValid = !field.isChangingValue && !hasErrors;

  if (hasErrors) {
    const [error] = field.errors;
    const message = error.message;

    if (error.code === EQL_ERROR_CODES.FAILED_REQUEST) {
      return { isValid, message, error: error.error };
    } else {
      return { isValid, message, messages: error.messages };
    }
  } else {
    return { isValid, message: '' };
  }
};
