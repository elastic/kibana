/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPattern } from '../../types';

/**
 * Checks if the provided field contains data (works for meta field)
 */
export function fieldContainsData(
  field: string,
  indexPattern: IndexPattern,
  existingFields: Record<string, boolean>
) {
  return (
    indexPattern.getFieldByName(field)?.type === 'document' || fieldExists(existingFields, field)
  );
}

/**
 * Performs an existence check on the existingFields data structure for the provided field.
 * Does not work for meta fields.
 */
export function fieldExists(existingFields: Record<string, boolean>, fieldName: string) {
  return existingFields[fieldName];
}
