/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

export const fetchIndexCounts = async (client: IScopedClusterClient, indicesNames: string[]) => {
  // TODO: is there way to batch this? Passing multiple index names or a pattern still returns a singular count
  const countPromises = indicesNames.map(async (indexName) => {
    const { count } = await client.asCurrentUser.count({ index: indexName });
    return { [indexName]: count };
  });
  const indexCountArray = await Promise.all(countPromises);
  return indexCountArray.reduce((acc, current) => ({ ...acc, ...current }), {});
};
