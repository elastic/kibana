/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const createStoredScriptBodySchema = schema.object({
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

type CreateStoredScriptBodySchema = TypeOf<typeof createStoredScriptBodySchema>;

export const createStoredScript = async ({
  client,
  options,
}: {
  client: IScopedClusterClient;
  options: CreateStoredScriptBodySchema;
}) => {
  await client.asCurrentUser.putScript(options);
};
