/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export const textObjectSchema = schema.object({
  createdAt: schema.number(),
  updatedAt: schema.number(),
  text: schema.string(),
});

export const textObjectSchemaWithId = schema.object({
  id: schema.string(),
  createdAt: schema.number(),
  updatedAt: schema.number(),
  text: schema.string(),
});

export type TextObjectSchemaWithId = TypeOf<typeof textObjectSchemaWithId>;
export type TextObjectSchema = TypeOf<typeof textObjectSchema>;
