/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import type { FieldHook, ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEqlRule } from '../../../../../common/detection_engine/utils';
import { KibanaServices } from '../../../../common/lib/kibana';
import type { DefineStepRule } from '../../../../detections/pages/detection_engine/rules/types';
import { DataSourceType } from '../../../../detections/pages/detection_engine/rules/types';
import type { EqlResponseError } from '../../../../common/hooks/eql/api';
import { validateEql, EQL_ERROR_CODES } from '../../../../common/hooks/eql/api';
import type { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';

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

export const transformEqlResponseErrorToValidationError = (
  responseError: EqlResponseError
): ValidationError<EQL_ERROR_CODES> => {
  if (responseError.error) {
    return {
      code: EQL_ERROR_CODES.FAILED_REQUEST,
      message: i18n.EQL_VALIDATION_REQUEST_ERROR,
      error: responseError.error,
    };
  }
  return {
    code: responseError.code,
    message: '',
    messages: responseError.messages,
  };
};

export const eqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<EQL_ERROR_CODES> | void | undefined> => {
  const [{ value, formData }] = args;
  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { dataViewId, index, ruleType, eqlOptions } = formData as DefineStepRule;

  const needsValidation =
    (ruleType === undefined && !isEmpty(query)) || (isEqlRule(ruleType) && !isEmpty(query));
  if (!needsValidation) {
    return;
  }

  try {
    const { data } = KibanaServices.get();
    let dataViewTitle = index?.join();
    let runtimeMappings = {};
    if (
      dataViewId != null &&
      dataViewId !== '' &&
      formData.dataSourceType === DataSourceType.DataView
    ) {
      const dataView = await data.dataViews.get(dataViewId);

      dataViewTitle = dataView.title;
      runtimeMappings = dataView.getRuntimeMappings();
    }

    const signal = new AbortController().signal;
    const response = await validateEql({
      data,
      query,
      signal,
      dataViewTitle,
      runtimeMappings,
      options: eqlOptions,
    });

    if (response?.valid === false && response.error) {
      return transformEqlResponseErrorToValidationError(response.error);
    }
  } catch (error) {
    return {
      code: EQL_ERROR_CODES.FAILED_REQUEST,
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

    if (error.code === EQL_ERROR_CODES.FAILED_REQUEST) {
      return { isValid, message, error: error.error };
    } else {
      return { isValid, message, messages: error.messages };
    }
  } else {
    return { isValid, message: '' };
  }
};
