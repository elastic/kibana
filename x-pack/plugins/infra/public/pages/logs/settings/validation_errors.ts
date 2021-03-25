/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface GenericValidationError {
  type: 'generic';
  message: string;
}

interface EmptyFieldValidationError {
  type: 'empty_field';
  fieldName: string;
}

interface EmptyColumnListValidationError {
  type: 'empty_column_list';
}

export type FormValidationError =
  | GenericValidationError
  | EmptyFieldValidationError
  | EmptyColumnListValidationError;

export const validateStringNotEmpty = (fieldName: string, value: string): FormValidationError[] =>
  value === '' ? [{ type: 'empty_field', fieldName }] : [];

export const validateColumnListNotEmpty = (columns: unknown[]): FormValidationError[] =>
  columns.length <= 0 ? [{ type: 'empty_column_list' }] : [];
