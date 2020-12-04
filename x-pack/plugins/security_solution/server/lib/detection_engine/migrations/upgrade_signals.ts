/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

export const upgradeSignals = async ({
  esClient,
  index,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  version: number;
}): Promise<string> => {
  const destinationIndexName = `${index}-r${version}`;
  await esClient.indices.create({ index: destinationIndexName });

  // TODO batch size?
  const response = await esClient.reindex<{ task: string }>({
    body: {
      dest: { index: destinationIndexName },
      source: { index },
    },
    refresh: true,
    wait_for_completion: false,
  });

  return response.body.task;
};
