/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from 'zod';

// Utility type that helps infer the underlying type of a `z.ZodOptional` type. First,
// checks if T is a ZodOptional type, and if it is, infers and returns the underlying type.
// If it is not, simply return the type T itself.
type InferredOptional<T extends z.ZodTypeAny> = T extends z.ZodOptional<infer U> ? U : T;

interface RuleFields<TRequired extends z.ZodRawShape, TOptional extends z.ZodRawShape> {
  required: TRequired;
  optional: TOptional;
}

export const buildSchema = <TRequired extends z.ZodRawShape, TOptional extends z.ZodRawShape>(
  fields: RuleFields<TRequired, TOptional>
) => {
  const optionalFields = Object.entries(fields.optional).reduce<z.ZodRawShape>(
    (acc, [key, schema]) => {
      acc[key] = schema.optional();
      return acc;
    },
    {}
  );

  const schema = z
    .object({
      ...fields.required,
      ...optionalFields,
    })
    .strict();

  return schema as z.ZodObject<
    TRequired & { [K in keyof TOptional]: InferredOptional<TOptional[K]> }
  >;
};
