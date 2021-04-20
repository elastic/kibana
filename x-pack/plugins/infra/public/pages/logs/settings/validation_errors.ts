/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern, KBN_FIELD_TYPES } from '../../../../../../../src/plugins/data/public';

export interface GenericValidationError {
  type: 'generic';
  message: string;
}

export interface ChildFormValidationError {
  type: 'child';
}

export interface EmptyFieldValidationError {
  type: 'empty_field';
  fieldName: string;
}

export interface EmptyColumnListValidationError {
  type: 'empty_column_list';
}

export interface MissingTimestampFieldValidationError {
  type: 'missing_timestamp_field';
  indexPatternTitle: string;
}

export interface MissingMessageFieldValidationError {
  type: 'missing_message_field';
  indexPatternTitle: string;
}

export interface InvalidMessageFieldTypeValidationError {
  type: 'invalid_message_field_type';
  indexPatternTitle: string;
}

export interface RollupIndexPatternValidationError {
  type: 'rollup_index_pattern';
  indexPatternTitle: string;
}

export type FormValidationError =
  | GenericValidationError
  | ChildFormValidationError
  | EmptyFieldValidationError
  | EmptyColumnListValidationError
  | MissingTimestampFieldValidationError
  | MissingMessageFieldValidationError
  | InvalidMessageFieldTypeValidationError
  | RollupIndexPatternValidationError;

export const validateStringNotEmpty = (fieldName: string, value: string): FormValidationError[] =>
  value === '' ? [{ type: 'empty_field', fieldName }] : [];

export const validateColumnListNotEmpty = (columns: unknown[]): FormValidationError[] =>
  columns.length <= 0 ? [{ type: 'empty_column_list' }] : [];

export const validateIndexPattern = (indexPattern: IndexPattern): FormValidationError[] => {
  return [
    ...validateIndexPatternIsTimeBased(indexPattern),
    ...validateIndexPatternHasStringMessageField(indexPattern),
    ...validateIndexPatternIsntRollup(indexPattern),
  ];
};

export const validateIndexPatternIsTimeBased = (
  indexPattern: IndexPattern
): FormValidationError[] =>
  indexPattern.isTimeBased()
    ? []
    : [
        {
          type: 'missing_timestamp_field' as const,
          indexPatternTitle: indexPattern.title,
        },
      ];

export const validateIndexPatternHasStringMessageField = (
  indexPattern: IndexPattern
): FormValidationError[] => {
  const messageField = indexPattern.getFieldByName('message');

  if (messageField == null) {
    return [
      {
        type: 'missing_message_field' as const,
        indexPatternTitle: indexPattern.title,
      },
    ];
  } else if (messageField.type !== KBN_FIELD_TYPES.STRING) {
    return [
      {
        type: 'invalid_message_field_type' as const,
        indexPatternTitle: indexPattern.title,
      },
    ];
  } else {
    return [];
  }
};

export const validateIndexPatternIsntRollup = (indexPattern: IndexPattern): FormValidationError[] =>
  indexPattern.type != null
    ? [
        {
          type: 'rollup_index_pattern' as const,
          indexPatternTitle: indexPattern.title,
        },
      ]
    : [];
