/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

export const availableIndices = async (
  client: IScopedClusterClient,
  indices: string[]
): Promise<string[]> => {
  if (await client.asCurrentUser.indices.exists({ index: indices })) return indices;

  const indicesAndExists: Array<[string, boolean]> = await Promise.all(
    indices.map(async (index) => [index, await client.asCurrentUser.indices.exists({ index })])
  );
  return indicesAndExists.flatMap(([index, exists]) => (exists ? [index] : []));
};
