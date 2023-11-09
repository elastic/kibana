/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDevMode } from '@kbn/xstate-utils';
import {
  isArray,
  isBoolean,
  isDate,
  isNil,
  isNumber,
  isPlainObject,
  isString,
  mapValues,
} from 'lodash';

export const getDevToolsOptions = (): boolean | object =>
  isDevMode()
    ? {
        actionSanitizer: sanitizeAction,
        stateSanitizer: sanitizeState,
      }
    : false;

const redactComplexValues = (value: unknown): unknown => {
  if (isString(value) || isNumber(value) || isBoolean(value) || isDate(value) || isNil(value)) {
    return value;
  }

  if (isArray(value)) {
    if (value.length > 100) {
      return '[redacted large array]';
    }
    return value.map(redactComplexValues);
  }

  if ((isPlainObject as (v: unknown) => v is object)(value)) {
    if (Object.keys(value).length > 100) {
      return '[redacted large object]';
    }
    return mapValues(value, (innerValue: unknown) => redactComplexValues(innerValue));
  }

  return `[redacted complex value of type ${typeof value}]`;
};

const sanitizeAction = redactComplexValues;

const sanitizeState = (state: Record<string, unknown>) => ({
  value: state.value,
  context: redactComplexValues(state.context),
});
