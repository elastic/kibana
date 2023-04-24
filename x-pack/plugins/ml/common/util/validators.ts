/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALLOWED_DATA_UNITS } from '../constants/validation';
import { parseInterval } from './parse_interval';

/**
 * Provides a validator function for maximum allowed input length.
 * @param maxLength Maximum length allowed.
 */
export function maxLengthValidator(
  maxLength: number
): (value: string) => { maxLength: { requiredLength: number; actualLength: number } } | null {
  return (value) =>
    value && value.length > maxLength
      ? {
          maxLength: {
            requiredLength: maxLength,
            actualLength: value.length,
          },
        }
      : null;
}

/**
 * Provides a validator function for checking against pattern.
 * @param pattern
 */
export function patternValidator(
  pattern: RegExp
): (value: string) => { pattern: { matchPattern: string } } | null {
  return (value) =>
    pattern.test(value)
      ? null
      : {
          pattern: {
            matchPattern: pattern.toString(),
          },
        };
}

/**
 * Composes multiple validators into a single function
 * @param validators
 */
export function composeValidators(
  ...validators: Array<(value: any) => { [key: string]: any } | null>
): (value: any) => { [key: string]: any } | null {
  return (value) => {
    const validationResult = validators.reduce((acc, validator) => {
      return {
        ...acc,
        ...(validator(value) || {}),
      };
    }, {});
    return Object.keys(validationResult).length > 0 ? validationResult : null;
  };
}

export function requiredValidator() {
  return <T extends string>(value: T) => {
    return value === '' || value === undefined || value === null ? { required: true } : null;
  };
}

export type ValidationResult = Record<string, any> | null;

export type MemoryInputValidatorResult = { invalidUnits: { allowedUnits: string } } | null;

export function memoryInputValidator(allowedUnits = ALLOWED_DATA_UNITS) {
  return <T>(value: T) => {
    if (typeof value !== 'string' || value === '') {
      return null;
    }
    const regexp = new RegExp(`\\d+(${allowedUnits.join('|')})$`, 'i');
    return regexp.test(value.trim())
      ? null
      : { invalidUnits: { allowedUnits: allowedUnits.join(', ') } };
  };
}

export function timeIntervalInputValidator() {
  return (value: string) => {
    if (value === '') {
      return null;
    }

    const r = parseInterval(value);
    if (r === null) {
      return {
        invalidTimeInterval: true,
      };
    }

    return null;
  };
}

export function dictionaryValidator(dict: string[], shouldInclude: boolean = false) {
  const dictSet = new Set(dict);
  return (value: string) => {
    if (dictSet.has(value) !== shouldInclude) {
      return { matchDict: value };
    }
    return null;
  };
}
