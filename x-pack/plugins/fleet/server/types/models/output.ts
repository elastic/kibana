/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { outputType } from '../../../common/constants';

const OutputBaseSchema = {
  name: schema.string(),
  type: schema.oneOf([schema.literal(outputType.Elasticsearch)]),
  hosts: schema.maybe(schema.arrayOf(schema.string())),
  api_key: schema.maybe(schema.string()),
  fleet_enroll_username: schema.maybe(schema.string()),
  fleet_enroll_password: schema.maybe(schema.string()),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  config_yaml: schema.maybe(schema.string()),
};

export const NewOutputSchema = schema.object({
  ...OutputBaseSchema,
});

export const OutputSchema = schema.object({
  ...OutputBaseSchema,
  id: schema.string(),
});
