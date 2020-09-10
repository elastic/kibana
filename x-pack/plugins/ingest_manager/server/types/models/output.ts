/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export enum OutputType {
  Elasticsearch = 'elasticsearch',
}

const OutputBaseSchema = {
  name: schema.string(),
  type: schema.oneOf([schema.literal(OutputType.Elasticsearch)]),
  hosts: schema.maybe(schema.arrayOf(schema.string())),
  api_key: schema.maybe(schema.string()),
  fleet_enroll_username: schema.maybe(schema.string()),
  fleet_enroll_password: schema.maybe(schema.string()),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
};

export const NewOutputSchema = schema.object({
  ...OutputBaseSchema,
});

export const OutputSchema = schema.object({
  ...OutputBaseSchema,
  id: schema.string(),
});
