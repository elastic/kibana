/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';

export interface IndexMappingsResponse {
  [indexName: string]: { mappings: { _meta: { version: number } } };
}

export interface IndexVersionsByIndex {
  [indexName: string]: number | undefined;
}

/**
 * Retrieves a breakdown of index versions for each
 * given signals index.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name(s) of the signals index(es)
 *
 * @returns a {@link IndexVersionsByIndex} object
 *
 * @throws if client returns an error
 */
export const getIndexVersionsByIndex = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}): Promise<IndexVersionsByIndex> => {
  const indexVersions = await esClient.indices.getMapping({
    index,
  });

  return index.reduce<IndexVersionsByIndex>(
    (agg, _index) => ({
      ...agg,
      [_index]: indexVersions[_index]?.mappings?._meta?.version,
    }),
    {}
  );
};
