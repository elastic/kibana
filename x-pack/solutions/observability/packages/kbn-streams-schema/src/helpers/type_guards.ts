/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ZodSchema, output, z } from '@kbn/zod';

export function createIsSchema<TSchema extends z.Schema>(schema: TSchema) {
  return (value: unknown): value is z.input<TSchema> => {
    return isSchema(schema, value);
  };
}

export function createAssertsSchema<TSchema extends z.Schema>(schema: TSchema) {
  return (value: unknown): asserts value is z.input<TSchema> => {
    return assertsSchema(schema, value);
  };
}

export function isSchema<TSchema extends z.Schema>(
  schema: TSchema,
  value: unknown
): value is z.input<TSchema> {
  try {
    schema.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

export function assertsSchema<TSchema extends ZodSchema>(
  schema: TSchema,
  subject: any
): asserts subject is output<TSchema> {
  schema.parse(subject);
}
