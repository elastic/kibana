/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema, TypeOf } from '@kbn/config-schema';

export enum OutputType {
  Elasticsearch = 'elasticsearch',
}

const OutputBaseSchema = {
  name: schema.string(),
  type: schema.oneOf([schema.literal(OutputType.Elasticsearch)]),
  username: schema.maybe(schema.string()),
  password: schema.maybe(schema.string()),
  index_name: schema.maybe(schema.string()),
  ingest_pipeline: schema.maybe(schema.string()),
  hosts: schema.maybe(schema.arrayOf(schema.string())),
  api_key: schema.maybe(schema.string()),
  admin_username: schema.maybe(schema.string()),
  admin_password: schema.maybe(schema.string()),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
};

export const NewOutputSchema = schema.object({
  ...OutputBaseSchema,
});

export const OutputSchema = schema.object({
  ...OutputBaseSchema,
  id: schema.string(),
});

export type NewOutput = TypeOf<typeof NewOutputSchema>;

export type Output = TypeOf<typeof OutputSchema>;
