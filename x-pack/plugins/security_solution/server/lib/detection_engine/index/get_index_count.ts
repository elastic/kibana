/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

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
