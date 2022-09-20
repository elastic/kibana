/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const createEsIndexBodySchema = schema.object({
  index: schema.string({ minLength: 1 }),
  mappings: schema.maybe(schema.recordOf(schema.string({ minLength: 1 }), schema.any())),
});

type CreateEsIndexBodySchema = TypeOf<typeof createEsIndexBodySchema>;

export const createIndex = async ({
  client,
  options,
}: {
  client: IScopedClusterClient;
  options: CreateEsIndexBodySchema;
}) => {
  await client.asCurrentUser.indices.create(options);
};
