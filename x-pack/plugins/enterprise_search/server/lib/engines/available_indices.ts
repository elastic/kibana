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
  const closedIndicesList = await closedIndices(client);

  const indicesExistsAndOpen: Array<[string, boolean]> = await Promise.all(
    indices.map(async (index) => [
      index,
      (await client.asCurrentUser.indices.exists({ index })) && !closedIndicesList.includes(index),
    ])
  );

  return indicesExistsAndOpen.flatMap(([index, exists]) => (exists ? [index] : []));
};

const closedIndices = async (client: IScopedClusterClient): Promise<string[]> => {
  const indices = await client.asCurrentUser.cat.indices({
    format: 'json',
  });
  return indices
    .filter((indexData) => indexData?.status === 'close')
    .map((indexData) => indexData?.index ?? '');
};
