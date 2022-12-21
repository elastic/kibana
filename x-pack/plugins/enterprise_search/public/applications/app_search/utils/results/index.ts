/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldValue,
  NestedFieldValue,
  ResultMeta,
  SimpleFieldValue,
  Snippet,
} from '../../components/result/types';

interface SearchApiWrappedFieldValue {
  raw?: SimpleFieldValue;
  snippet?: Snippet;
}
type SearchApiNestedFieldValue =
  | { [key: string]: SearchApiNestedFieldValue | SearchApiWrappedFieldValue }
  | SearchApiNestedFieldValue[];
type SearchApiFieldValue = ResultMeta | SearchApiWrappedFieldValue | SearchApiNestedFieldValue;

function isResultMeta(fieldName: string, _: SearchApiFieldValue): _ is ResultMeta {
  return fieldName === '_meta';
}

function isFieldValueWrapper(
  fieldValue: SearchApiFieldValue
): fieldValue is SearchApiWrappedFieldValue {
  return (
    fieldValue &&
    Object.entries(fieldValue).reduce((isValueWrapper: boolean, [k, v]) => {
      if (k !== 'raw' && k !== 'snippet') {
        return false;
      }

      if (v === null) {
        return isValueWrapper;
      }

      return (Array.isArray(v) ? v : [v]).reduce((isScalar, currentValue) => {
        return isScalar && currentValue !== null && typeof currentValue !== 'object';
      }, isValueWrapper);
    }, true)
  );
}

function isNestedFieldValue(
  fieldValue: SearchApiFieldValue
): fieldValue is SearchApiNestedFieldValue {
  if (Array.isArray(fieldValue)) {
    return fieldValue.reduce(
      (isNested: boolean, current) => isNested || isNestedFieldValue(current),
      false
    );
  }

  return fieldValue != null && typeof fieldValue === 'object' && !isFieldValueWrapper(fieldValue);
}

function formatNestedFieldValue(
  fieldValue: SearchApiNestedFieldValue | SearchApiWrappedFieldValue
): NestedFieldValue {
  if (Array.isArray(fieldValue)) {
    return fieldValue.map(formatNestedFieldValue);
  }

  if (fieldValue !== null && typeof fieldValue === 'object') {
    return Object.entries(fieldValue).reduce(
      (formattedFieldValue, [nestedFieldName, currentValue]) => {
        return {
          ...formattedFieldValue,
          [nestedFieldName]: isFieldValueWrapper(currentValue)
            ? currentValue.raw
            : formatNestedFieldValue(currentValue),
        };
      },
      {}
    );
  }

  return fieldValue;
}

export function formatResult(
  result: Record<string, SearchApiFieldValue>
): Record<string, ResultMeta | FieldValue> {
  return Object.entries(result).reduce((acc, [fieldName, fieldValue]) => {
    if (!isResultMeta(fieldName, fieldValue) && isNestedFieldValue(fieldValue)) {
      return { ...acc, [fieldName]: { raw: formatNestedFieldValue(fieldValue) } };
    }

    return { ...acc, [fieldName]: fieldValue };
  }, {});
}

export function formatResultWithoutMeta(
  result: Record<string, SearchApiFieldValue>
): Record<string, FieldValue> {
  return Object.entries(result).reduce((acc, [fieldName, fieldValue]) => {
    if (isResultMeta(fieldName, fieldValue)) {
      return { ...acc };
    }

    if (isNestedFieldValue(fieldValue)) {
      return { ...acc, [fieldName]: { raw: formatNestedFieldValue(fieldValue) } };
    }

    return { ...acc, [fieldName]: fieldValue };
  }, {});
}
