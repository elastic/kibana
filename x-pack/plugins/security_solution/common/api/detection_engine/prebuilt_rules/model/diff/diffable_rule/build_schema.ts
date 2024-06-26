/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
// TODO https://github.com/elastic/security-team/issues/7491
// eslint-disable-next-line no-restricted-imports

export type OrUndefined<P extends t.Props> = {
  [K in keyof P]: P[K] | t.UndefinedC;
};

export const orUndefined = <P extends t.Props>(props: P): OrUndefined<P> => {
  return Object.keys(props).reduce<t.Props>((acc, key) => {
    acc[key] = t.union([props[key], t.undefined]);
    return acc;
  }, {}) as OrUndefined<P>;
};

interface RuleFields<TRequired extends t.Props, TOptional extends t.Props> {
  required: TRequired;
  optional: TOptional;
}

export const buildSchema = <TRequired extends t.Props, TOptional extends t.Props>(
  fields: RuleFields<TRequired, TOptional>
) => {
  return t.intersection([
    t.exact(t.type(fields.required)),
    t.exact(t.type(orUndefined(fields.optional))),
  ]);
};

import { z } from 'zod';

type InferredOptional<T extends z.ZodTypeAny> = T extends z.ZodOptional<infer U> ? U : T;

interface RuleFields2<TRequired extends z.ZodRawShape, TOptional extends z.ZodRawShape> {
  required: TRequired;
  optional: TOptional;
}

export const buildSchemaNew = <TRequired extends z.ZodRawShape, TOptional extends z.ZodRawShape>(
  fields: RuleFields2<TRequired, TOptional>
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
    TRequired & { [K in keyof TOptional]: z.ZodOptional<InferredOptional<TOptional[K]>> }
  >;
};

const exampleSchema = buildSchemaNew({
  required: {
    id: z.string(),
    name: z.string(),
  },
  optional: {
    age: z.number(),
    email: z.string().email(),
  },
});

const exampleSchema2 = buildSchema({
  required: {
    id: t.string,
    name: t.string,
  },
  optional: {
    age: t.number
    email: t.string
  },
});

type Example = z.infer<typeof exampleSchema>;
type Example2 = t.TypeOf<typeof exampleSchema2>;
// Importar buildSchema2 en diffable_rule y ver si el type es el mismo
