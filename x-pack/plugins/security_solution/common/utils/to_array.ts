/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toArray = <T = string>(value: T | T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : value == null ? [] : [value];

export const toStringArray = <T = string>(value: T | T[] | null): string[] => {
  if (Array.isArray(value)) {
    return value.reduce<string[]>((acc, v) => {
      if (v != null) {
        switch (typeof v) {
          case 'number':
          case 'boolean':
            return [...acc, v.toString()];
          case 'object':
            try {
              return [...acc, JSON.stringify(v)];
            } catch {
              return [...acc, 'Invalid Object'];
            }
          case 'string':
            return [...acc, v];
          default:
            return [...acc, `${v}`];
        }
      }
      return acc;
    }, []);
  } else if (value == null) {
    return [];
  } else if (!Array.isArray(value) && typeof value === 'object') {
    try {
      return [JSON.stringify(value)];
    } catch {
      return ['Invalid Object'];
    }
  } else {
    return [`${value}`];
  }
};

export const toObjectArrayOfStrings = <T = string>(
  value: T | T[] | null
): Array<{
  str: string;
  isObjectArray?: boolean;
}> => {
  if (Array.isArray(value)) {
    return value.reduce<
      Array<{
        str: string;
        isObjectArray?: boolean;
      }>
    >((acc, v) => {
      if (v != null) {
        switch (typeof v) {
          case 'number':
          case 'boolean':
            return [...acc, { str: v.toString() }];
          case 'object':
            try {
              return [...acc, { str: JSON.stringify(v), isObjectArray: true }]; // need to track when string is not a simple value
            } catch {
              return [...acc, { str: 'Invalid Object' }];
            }
          case 'string':
            return [...acc, { str: v }];
          default:
            return [...acc, { str: `${v}` }];
        }
      }
      return acc;
    }, []);
  } else if (value == null) {
    return [];
  } else if (!Array.isArray(value) && typeof value === 'object') {
    try {
      return [{ str: JSON.stringify(value), isObjectArray: true }];
    } catch {
      return [{ str: 'Invalid Object' }];
    }
  } else {
    return [{ str: `${value}` }];
  }
};
