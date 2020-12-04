/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';

export const createSignalsUpgradeIndex = async ({
  esClient,
  index,
  version,
}: {
  esClient: ElasticsearchClient;
  index: string;
  version: number;
}): Promise<string> => {
  const paddedVersion = `${version}`.padStart(6, '0');
  const destinationIndexName = `${index}-r${paddedVersion}`;

  const response = await esClient.indices.create<{ index: string }>({
    index: destinationIndexName,
    body: {
      settings: {
        index: {
          lifecycle: {
            indexing_complete: true,
          },
        },
      },
    },
  });

  return response.body.index;
};
