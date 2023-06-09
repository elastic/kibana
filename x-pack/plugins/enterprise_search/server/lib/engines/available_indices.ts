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
  const availableIndicesList = await client.asCurrentUser.indices.get({
    expand_wildcards: ['all'],
    features: ['aliases', 'settings'],
    filter_path: ['*.aliases', '*.settings.index.verified_before_close'],
    index: '*',
  });

  return indices.filter(
    (index) =>
      Object.keys(availableIndicesList).includes(index) &&
      !(
        availableIndicesList[index].settings?.index?.verified_before_close === true ||
        availableIndicesList[index].settings?.index?.verified_before_close === 'true'
      )
  );
};
