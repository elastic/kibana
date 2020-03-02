/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const ConfigSchemaProps = {
  apiUrl: schema.string(),
  casesConfiguration: schema.maybe(
    schema.object({
      closure: schema.oneOf([
        schema.literal('manual'),
        schema.literal('new_incident'),
        schema.literal('closed_incident'),
      ]),
      mapping: schema.recordOf(
        schema.string(),
        schema.object({
          thirdPartyField: schema.string(),
          onEditAndUpdate: schema.oneOf([
            schema.literal('nothing'),
            schema.literal('overwrite'),
            schema.literal('append'),
          ]),
        })
      ),
    })
  ),
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
