/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ECSField } from '../types';

export function hasValue<T>(valueOrCollection: ECSField<T>, expected: T): boolean {
  if (Array.isArray(valueOrCollection)) {
    return valueOrCollection.includes(expected);
  } else {
    return valueOrCollection === expected;
  }
}

/**
 * Return first non-null value.
 */
export function firstValue<T>(valueOrCollection: ECSField<T>): T | undefined {
  if (valueOrCollection === null) {
    // make it consistent
    return undefined;
  } else if (Array.isArray(valueOrCollection)) {
    for (const value of valueOrCollection) {
      // TODO can ES return an array with null in the first position and non-null values later on?
      if (value !== null) {
        return value;
      }
    }
  } else {
    return valueOrCollection;
  }
}

/*
 * Get an array of all non-null values. If there was originally 1 value, return it wrapped in an array. If there were multiple values, return the non-null ones.
 * Use this when you want to consistently access the value(s) as an array.
 */
export function values<T>(valueOrCollection: ECSField<T>): T[] {
  if (Array.isArray(valueOrCollection)) {
    const nonNullValues: T[] = [];
    for (const value of valueOrCollection) {
      if (value !== null) {
        nonNullValues.push(value);
      }
    }
    return nonNullValues;
  } else if (valueOrCollection !== null) {
    // if there is a single non-null value, wrap it in an array and return it.
    return [valueOrCollection];
  } else {
    // if the value was null, return `[]`.
    return [];
  }
}
