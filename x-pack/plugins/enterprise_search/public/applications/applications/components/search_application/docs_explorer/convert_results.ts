/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchResult } from '@elastic/search-ui';

export interface FieldValue {
  raw?: unknown;
  snippet?: string | string[];
}

export interface ConvertedResult {
  field: string;
  value: FieldValue;
}

export interface ConvertedResultWithType extends ConvertedResult {
  type: string;
}

export interface FieldsAndIndex {
  fields: ConvertedResult[];
  index: string;
}

export const resetOriginalid = (result: SearchResult): SearchResult => {
  const {
    _meta: {
      rawHit: { __id: id },
    },
  } = result;
  return {
    ...result,
    id: { raw: id },
  };
};

export const getIndex = (result: SearchResult): string => {
  const {
    _meta: {
      rawHit: { _index: index },
    },
  } = result;
  return index;
};

export const isFieldValue = (value: unknown): value is FieldValue => {
  if (value === null || typeof value !== 'object') return false;
  return value.hasOwnProperty('raw') || value.hasOwnProperty('snippet');
};

export const flattenObjectPreservingValues = (
  obj: Record<string, unknown>,
  prefix = ''
): Record<string, FieldValue> => {
  if (isFieldValue(obj) && typeof obj.raw !== 'object') return { [prefix]: obj };

  return Object.keys(obj).reduce((acc: Record<string, FieldValue>, key: string) => {
    const dot = prefix.length ? prefix + '.' : '';
    const val = obj[key];
    if (typeof val === 'object' && val !== null) {
      Object.assign(
        acc,
        flattenObjectPreservingValues(
          val as Record<string, unknown>,
          key === 'raw' ? prefix : dot + key
        )
      );
    } else {
      acc[dot + key] = { raw: val };
    }
    return acc;
  }, {});
};

export const convertResults = (result: Record<string, unknown>): ConvertedResult[] => {
  const flattenedResult = flattenObjectPreservingValues(result);
  const unsortedFields = Object.entries(flattenedResult).map(([field, value]) => ({
    field,
    value,
  }));
  const sortedFields = unsortedFields.sort((a, b) => a.field.localeCompare(b.field));
  return sortedFields;
};

export const convertResultToFieldsAndIndex = (result: SearchResult): FieldsAndIndex => {
  const index = getIndex(result);
  const { _meta: _, ...withOriginalId } = resetOriginalid(result);
  const fields = convertResults(withOriginalId);

  return { fields, index };
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
