/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

export const DataStreamsRequestSchema = {
  query: schema.object({
    selected: schema.oneOf([
      schema.arrayOf(schema.string({ minLength: 1 }), { minSize: 1 }),
      schema.string(),
    ]),
  }),
};

export type DataStreamsRequestQuery = TypeOf<typeof DataStreamsRequestSchema.query>;

export const DataStreamsResponseSchema = {
  body: () =>
    schema.arrayOf(
      schema.object({
        name: schema.string(),
        storageSizeBytes: schema.number(),
        selected: schema.boolean(),
      })
    ),
};

export type DataStreamsResponseBodySchemaBody = TypeOf<typeof DataStreamsResponseSchema.body>;
