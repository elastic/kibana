/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

export type SampleDocument = Record<string, unknown>;

export const getSampleDocuments = async ({
  indexName,
  esClient,
  maxSamples = 5,
}: {
  indexName: string;
  esClient: ElasticsearchClient;
  maxSamples?: number;
}): Promise<{ samples: SampleDocument[] }> => {
  const response = await esClient.search({
    index: indexName,
    size: maxSamples,
  });

  const documents = response.hits.hits.map((hit) => hit._source! as Record<string, unknown>);

  return { samples: documents };
};
