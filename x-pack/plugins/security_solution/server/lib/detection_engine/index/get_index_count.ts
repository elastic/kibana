/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'src/core/server';

/**
 * Retrieves the count of documents in a given index
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index index whose documents will be counted
 *
 * @returns the document count
 */
export const getIndexCount = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string;
}): Promise<number> => {
  const response = await esClient.count<{ count: number }>({
    index,
  });

  return response.body.count;
};
