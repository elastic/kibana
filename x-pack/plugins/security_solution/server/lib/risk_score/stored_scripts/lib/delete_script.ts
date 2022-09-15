/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const deleteStoredScriptBodySchema = schema.object({
  id: schema.string({ minLength: 1 }),
});

type DeleteStoredScriptBodySchema = TypeOf<typeof deleteStoredScriptBodySchema>;

export const deleteStoredScript = async ({
  client,
  options,
}: {
  client: IScopedClusterClient;
  options: DeleteStoredScriptBodySchema;
}) => {
  await client.asCurrentUser.deleteScript(options);
};
