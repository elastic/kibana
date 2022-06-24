/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';

export const fetchMapping = async (
  client: IScopedClusterClient,
  indexName: string
): Promise<IndicesGetMappingIndexMappingRecord> => {
  const mapping = await client.asCurrentUser.indices.getMapping({
    index: indexName,
    expand_wildcards: ['open'],
  });
  return mapping[indexName];
};
