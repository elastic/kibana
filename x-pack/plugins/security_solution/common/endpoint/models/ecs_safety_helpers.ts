/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function hasValue<T>(valueOrCollection: T | T[] | undefined, expected: T): boolean {
  if (Array.isArray(valueOrCollection)) {
    return valueOrCollection.includes(expected);
  } else {
    return valueOrCollection === expected;
  }
}

export function firstValue<T>(valueOrCollection: T | T[] | undefined): T | undefined {
  if (Array.isArray(valueOrCollection)) {
    return valueOrCollection[0];
  } else {
    return valueOrCollection;
  }
}

export function values<T>(valueOrCollection: T | T[] | undefined): T[] {
  if (Array.isArray(valueOrCollection)) {
    return valueOrCollection;
  } else if (valueOrCollection !== undefined) {
    // wrap it in an array
    return [valueOrCollection];
  } else {
    // return `[]` for undefined
    return [];
  }
}
