/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { IndexMappingsResponse, MigrationStatus, MigrationStatusSearchResponse } from './types';

/**
 * Retrieves a breakdown of information relevant to the migration of each
 * given signals index.
 *
 * This includes:
 *   * the mappings version of the index
 *   * aggregated counts of the schema versions of signals in the index
 *   * aggregated counts of the migration versions of signals in the index
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name(s) of the signals index(es)
 *
 * @returns an array of {@link MigrationStatus} objects
 *
 * @throws if elasticsearch returns an error
 */
export const getMigrationStatus = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}): Promise<MigrationStatus[]> => {
  if (index.length === 0) {
    return [];
  }

  const { body: indexVersions } = await esClient.indices.getMapping<IndexMappingsResponse>({
    index,
  });
  const response = await esClient.search<MigrationStatusSearchResponse>({
    index,
    size: 0,
    body: {
      aggs: {
        signals_indices: {
          terms: {
            field: '_index',
          },
          aggs: {
            signal_versions: {
              terms: {
                field: 'signal._meta.version',
                missing: 0,
              },
            },
          },
        },
      },
    },
  });

  const indexBuckets = response.body.aggregations.signals_indices.buckets;
  return indexBuckets.reduce<MigrationStatus[]>((statuses, bucket) => {
    const indexName = bucket.key;
    const indexVersion = indexVersions[indexName]?.mappings?._meta?.version ?? 0;

    return [
      ...statuses,
      {
        name: indexName,
        version: indexVersion,
        signal_versions: bucket.signal_versions.buckets,
      },
    ];
  }, []);
};
