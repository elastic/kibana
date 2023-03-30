/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

type FlatRecord<T extends string | number | symbol, U> = Record<T, Exclude<U, object>>;

export const flattenObject = (
  obj: Record<string, unknown>,
  prefix = ''
): FlatRecord<string, unknown> => {
  return Object.keys(obj).reduce((acc: FlatRecord<string, unknown>, key: string) => {
    const dot = prefix.length ? prefix + '.' : '';
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !React.isValidElement(val)) {
      Object.assign(acc, flattenObject(val as Record<string, unknown>, dot + key));
    } else {
      acc[dot + key] = val;
    }
    return acc;
  }, {});
};

export interface ConvertedResult {
  field: string;
  value: React.ReactNode;
}

export interface ConvertedResultWithType extends ConvertedResult {
  type: string;
}

interface FieldValue {
  raw?: string | number | boolean;
  snippet?: string | string[];
}

const getValue = (value: FieldValue): React.ReactNode => {
  if (value.snippet && value.snippet.length) {
    const [highlighted] = value.snippet;
    return React.createElement('span', { dangerouslySetInnerHTML: { __html: highlighted } });
  }
  return typeof value === 'object' ? value.raw : value;
};

export const convertResults = (result: Record<string, unknown>): ConvertedResult[] => {
  const pluckedValues = Object.fromEntries(
    Object.entries(result).map(([field, value]) => [field, getValue(value as FieldValue)])
  );
  const flattenedResult = flattenObject(pluckedValues);
  const unsortedFields = Object.entries(flattenedResult).map(
    ([field, value]: [string, unknown]) => ({
      field,
      value: React.isValidElement(value)
        ? value
        : typeof value === 'string'
        ? value
        : JSON.stringify(value),
    })
  );
  const sortedFields = unsortedFields.sort((a, b) => a.field.localeCompare(b.field));
  return sortedFields;
};

export const addTypeToResults = (
  results: ConvertedResult[],
  fieldTypes: Record<string, string>
): ConvertedResultWithType[] => {
  return results.map((result) => {
    const type = fieldTypes[result.field];
    return { ...result, type };
  });
};
