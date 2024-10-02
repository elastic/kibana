/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Fields } from './types';

export const normalizeValue = <T>(field: unknown[] | unknown): T => {
  return (Array.isArray(field) && field.length > 0 ? field[0] : field) as T;
};

export const isOptionalFieldDefined = (fields: Fields, fieldToCheck: string): boolean =>
  Object.keys(fields).some((field) => field.startsWith(fieldToCheck));

export const cleanUndefinedFields = <T extends Record<string, unknown>>(fields: T): T =>
  Object.entries(fields)
    .filter(([_key, value]) => value !== undefined)
    .reduce((definedFields, [key, value]) => {
      definedFields[key] = value;
      return definedFields;
    }, {} as Record<string, unknown>) as T;
