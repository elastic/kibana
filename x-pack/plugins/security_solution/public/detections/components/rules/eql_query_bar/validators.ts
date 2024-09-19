/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import { FieldHook, ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEqlRule } from '../../../../../common/detection_engine/utils';
import { KibanaServices } from '../../../../common/lib/kibana';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import { validateEql } from '../../../../common/hooks/eql/api';
import { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';

export enum ERROR_CODES {
  FAILED_REQUEST = 'ERR_FAILED_REQUEST',
  INVALID_EQL = 'ERR_INVALID_EQL',
}

/**
 * Unlike lodash's debounce, which resolves intermediate calls with the most
 * recent value, this implementation waits to resolve intermediate calls until
 * the next invocation resolves.
 *
 * @param fn an async function
 *
 * @returns A debounced async function that resolves on the next invocation
 */
export const debounceAsync = <Args extends unknown[], Result extends Promise<unknown>>(
  fn: (...args: Args) => Result,
  interval: number
): ((...args: Args) => Result) => {
  let handle: ReturnType<typeof setTimeout> | undefined;
  let resolves: Array<(value?: Result) => void> = [];

  return (...args: Args): Result => {
    if (handle) {
      clearTimeout(handle);
    }

    handle = setTimeout(() => {
      const result = fn(...args);
      resolves.forEach((resolve) => resolve(result));
      resolves = [];
    }, interval);

    return new Promise((resolve) => resolves.push(resolve)) as Result;
  };
};

export const eqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData }] = args;
  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { index, ruleType } = formData as DefineStepRule;

  const needsValidation =
    (ruleType === undefined && !isEmpty(query)) || (isEqlRule(ruleType) && !isEmpty(query));
  if (!needsValidation) {
    return;
  }

  try {
    const { data } = KibanaServices.get();
    const signal = new AbortController().signal;
    const response = await validateEql({ data, query, signal, index });

    if (response?.valid === false) {
      return {
        code: ERROR_CODES.INVALID_EQL,
        message: '',
        messages: response.errors,
      };
    }
  } catch (error) {
    return {
      code: ERROR_CODES.FAILED_REQUEST,
      message: i18n.EQL_VALIDATION_REQUEST_ERROR,
      error,
    };
  }
};

export const getValidationResults = <T = unknown>(
  field: FieldHook<T>
): { isValid: boolean; message: string; messages?: string[]; error?: Error } => {
  const hasErrors = field.errors.length > 0;
  const isValid = !field.isChangingValue && !hasErrors;

  if (hasErrors) {
    const [error] = field.errors;
    const message = error.message;

    if (error.code === ERROR_CODES.INVALID_EQL) {
      return { isValid, message, messages: error.messages };
    } else {
      return { isValid, message, error: error.error };
    }
  } else {
    return { isValid, message: '' };
  }
};
