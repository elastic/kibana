/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export const findExistingIndices = async (
  indices: string[],
  esClient: ElasticsearchClient
): Promise<boolean[]> =>
  Promise.all(
    indices
      .map(async (index) => {
        const indexToQuery = index.trim().startsWith('-')
          ? index.trim().substring(1)
          : index.trim();
        const searchResponse = await esClient.fieldCaps({
          index: indexToQuery,
          fields: '_id',
          ignore_unavailable: true,
          allow_no_indices: false,
        });
        return searchResponse.indices.length > 0;
      })
      .map((p) => p.catch((e) => false))
  );
