/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient } from 'src/core/server';
import { Bucket, MigrationStatus } from './types';

interface MigrationStatusSearchResponse {
  aggregations: {
    signals_indices: {
      buckets: Array<{
        key: string;
        migration_version: {
          buckets: Bucket[];
        };
        schema_version: {
          buckets: Bucket[];
        };
      }>;
    };
  };
}

interface IndexMappingsResponse {
  [indexName: string]: { mappings: { _meta: { version: number } } };
}

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
            migration_version: {
              terms: {
                field: 'signal._meta.migration_version',
                missing: 0,
              },
            },
            schema_version: {
              terms: {
                field: 'signal._meta.schema_version',
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
    const indexVersion = indexVersions[indexName].mappings._meta.version;
    return [
      ...statuses,
      {
        name: indexName,
        version: indexVersion,
        migration_versions: bucket.migration_version.buckets,
        schema_versions: bucket.schema_version.buckets,
      },
    ];
  }, []);
};
