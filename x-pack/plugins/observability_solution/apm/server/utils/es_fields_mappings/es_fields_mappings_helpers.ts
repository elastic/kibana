/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Fields } from './types';

export const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length === 1 ? field[0] : field) as T;
};

export const isOptionalFieldDefined = (fields: Fields, fieldToCheck: string): boolean =>
  Object.keys(fields)
    .filter((field) => field.includes(fieldToCheck))
    .some((fieldName) => normalizeValue(fields[fieldName]) !== undefined);
