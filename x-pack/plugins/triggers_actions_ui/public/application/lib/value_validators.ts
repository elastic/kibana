/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { constant } from 'lodash';

export function throwIfAbsent<T>(message: string) {
  return (value: T | undefined): T => {
    if (value === undefined || value === null) {
      throw new Error(message);
    }
    return value;
  };
}

export function throwIfIsntContained<T>(
  requiredValues: Set<string>,
  message: string | ((requiredValue: string) => string),
  valueExtractor: (value: T) => string
) {
  const toError = typeof message === 'function' ? message : constant(message);
  return (values: T[]) => {
    const availableValues = new Set(values.map(valueExtractor));
    for (const value of requiredValues.values()) {
      if (!availableValues.has(value)) {
        throw new Error(toError(value));
      }
    }
    return values;
  };
}

export const isValidUrl = (urlString: string, protocol?: string) => {
  try {
    const urlObject = new URL(urlString);
    if (protocol === undefined || urlObject.protocol === protocol) {
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
};
