/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from 'zod';

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
      acc[key] = z.optional(schema);
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
    TRequired & { [K in keyof TOptional]: z.ZodOptional<InferredOptional<TOptional[K]>> }
  >;
};
