/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type FlatRecord<T extends string | number | symbol, U> = Record<T, Exclude<U, object>>;

export const flattenObject = (
  obj: Record<string, unknown>,
  prefix = ''
): FlatRecord<string, unknown> => {
  return Object.keys(obj).reduce((acc: FlatRecord<string, unknown>, key: string) => {
    const dot = prefix.length ? prefix + '.' : '';
    const val = obj[key];
    if (val !== null && typeof val === 'object') {
      Object.assign(acc, flattenObject(val as Record<string, unknown>, dot + key));
    } else {
      acc[dot + key] = val;
    }
    return acc;
  }, {});
};

export interface ConvertedResult {
  field: string;
  value: string;
}

export const convertResults = (result: Record<string, unknown>): ConvertedResult[] => {
  const flattenedResult = flattenObject(result);
  const unsortedFields = Object.entries(flattenedResult).map(
    ([field, value]: [string, unknown]) => ({
      field,
      value: JSON.stringify(value),
    })
  );
  const sortedFields = unsortedFields.sort((a, b) => a.field.localeCompare(b.field));
  return sortedFields;
};
