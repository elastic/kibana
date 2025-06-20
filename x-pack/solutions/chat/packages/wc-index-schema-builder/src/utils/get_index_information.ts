/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

export interface IndexInformation {
  mappings: MappingTypeMapping;
}

export const getIndexInformation = async ({
  indexName,
  esClient,
}: {
  indexName: string;
  esClient: ElasticsearchClient;
}): Promise<IndexInformation> => {
  const response = await esClient.indices.getMapping({ index: indexName });

  const mappings = response[indexName]!.mappings;

  return {
    mappings,
  };
};
