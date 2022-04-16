/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

/**
 * Creates the destination index to be used during the migration of a
 * given signals index.
 *
 * The destination index's name is determined by adding a suffix of
 * `-r${templateVersion}` to the source index name
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name of the source signals index
 * @param version version of the current signals template/mappings
 *
 * @returns the name of the created index
 */
export const createMigrationIndex = async ({
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

  const response = await esClient.indices.create({
    index: destinationIndexName,
    body: {
      settings: {
        index: {
          // @ts-expect-error `name` is required on IndicesIndexSettingsLifecycle
          lifecycle: {
            indexing_complete: true,
          },
        },
      },
    },
  });

  return response.index;
};
