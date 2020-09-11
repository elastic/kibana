/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ECSField } from '../types';

/**
 * Use these functions to accecss information held in `ECSField`s.
 */

/**
 * True if the field contains `expected`. If the field contains an array, this will be true if the array contains `expected`.
 */
export function hasValue<T>(valueOrCollection: ECSField<T>, expected: T): boolean {
  if (Array.isArray(valueOrCollection)) {
    return valueOrCollection.includes(expected);
  } else {
    return valueOrCollection === expected;
  }
}

/**
 * Return first non-null value. If the field contains an array, this will return the first value that isn't null. If the field isn't an array it'll be returned unless it's null.
 */
export function firstNonNullValue<T>(valueOrCollection: ECSField<T>): T | undefined {
  if (valueOrCollection === null) {
    return undefined;
  } else if (Array.isArray(valueOrCollection)) {
    for (const value of valueOrCollection) {
      if (value !== null) {
        return value;
      }
    }
  } else {
    return valueOrCollection;
  }
}

/*
 * Get an array of all non-null values. If there is just 1 value, return it wrapped in an array. If there are multiple values, return the non-null ones.
 * Use this when you want to consistently access the value(s) as an array.
 */
export function values<T>(valueOrCollection: ECSField<T>): T[] {
  if (Array.isArray(valueOrCollection)) {
    const nonNullValues: T[] = [];
    for (const value of valueOrCollection) {
      if (value !== null && value !== undefined) {
        nonNullValues.push(value);
      }
    }
    return nonNullValues;
  } else if (valueOrCollection !== null && valueOrCollection !== undefined) {
    // if there is a single non-null value, wrap it in an array and return it.
    return [valueOrCollection];
  } else {
    // if the value was null, return `[]`.
    return [];
  }
}
