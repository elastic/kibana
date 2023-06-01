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
  const closedIndicesList = await client.asCurrentUser.indices.get({
    expand_wildcards: ['closed'],
    features: ['aliases', 'settings'],
    filter_path: ['*.settings.index.verified_before_close'],
    index: '*',
  });
  const availableIndicesList = await client.asCurrentUser.indices.get({
    expand_wildcards: ['all'],
    features: ['aliases', 'settings'],
    filter_path: ['*.aliases'],
    index: '*',
  });
  return indices.filter(
    (index) =>
      Object.keys(availableIndicesList).includes(index) &&
      !Object.keys(closedIndicesList).includes(index)
  );
};
