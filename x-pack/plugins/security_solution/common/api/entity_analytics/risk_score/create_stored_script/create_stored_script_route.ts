/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const createStoredScriptRequestBody = schema.object({
  id: schema.string({ minLength: 1 }),
  script: schema.object({
    lang: schema.oneOf([
      schema.string(),
      schema.literal('painless'),
      schema.literal('expression'),
      schema.literal('mustache'),
      schema.literal('java'),
    ]),
    options: schema.maybe(schema.recordOf(schema.string(), schema.string())),
    source: schema.string(),
  }),
});

export type CreateStoredScriptRequestBody = TypeOf<typeof createStoredScriptRequestBody>;
