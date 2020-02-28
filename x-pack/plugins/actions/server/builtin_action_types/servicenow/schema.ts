/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchemaProps = {
  apiUrl: schema.string(),
};

export const ConfigSchema = schema.object(ConfigSchemaProps);

export const SecretsSchemaProps = {
  password: schema.string(),
  username: schema.string(),
};

export const SecretsSchema = schema.object(SecretsSchemaProps);

export const ParamsSchema = schema.object({
  comments: schema.maybe(schema.string()),
  short_description: schema.string(),
});
