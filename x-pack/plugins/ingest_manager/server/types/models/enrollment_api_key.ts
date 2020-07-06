/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';

export const EnrollmentAPIKeySchema = schema.object({
  id: schema.string(),
  api_key_id: schema.string(),
  api_key: schema.string(),
  name: schema.maybe(schema.string()),
  active: schema.boolean(),
  config_id: schema.maybe(schema.string()),
});

export const EnrollmentAPIKeySOAttributesSchema = schema.object({
  api_key_id: schema.string(),
  api_key: schema.string(),
  name: schema.maybe(schema.string()),
  active: schema.boolean(),
  config_id: schema.maybe(schema.string()),
  // ASK: Is this allowUnknown? How do we type this with config-schema?
  // [k: string]: schema.any(), // allow to use it as saved object attributes type
});
