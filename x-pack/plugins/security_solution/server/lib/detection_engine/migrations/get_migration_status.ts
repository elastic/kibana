/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { SignalsMigrationSO } from './saved_objects_schema';
import { signalsMigrationService } from './migration_service';
import {
  Bucket,
  IndexMappingsResponse,
  MigrationStatus,
  MigrationStatusSearchResponse,
} from './types';

interface SignalsVersionsByIndex {
  [indexName: string]: Bucket[] | undefined;
}

/**
 * Retrieves a breakdown of signals version for each
 * given signals index.
 *
 * @param esClient An {@link ElasticsearchClient}
 * @param index name(s) of the signals index(es)
 *
 * @returns a {@link SignalsVersionsByIndex} object
 *
 * @throws if SO client returns an error
 */
export const getSignalsVersions = async ({
  esClient,
  index,
}: {
  esClient: ElasticsearchClient;
  index: string[];
}): Promise<SignalsVersionsByIndex> => {
  const { body } = await esClient.search<MigrationStatusSearchResponse>({
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

  return body.aggregations.signals_indices.buckets.reduce<SignalsVersionsByIndex>(
    (agg, bucket) => ({ ...agg, [bucket.key]: bucket.signal_versions.buckets }),
    {}
  );
};

interface MigrationsByIndex {
  [indexName: string]: SignalsMigrationSO[] | undefined;
}

/**
 * Retrieves a list of migrations SOs for each
 * given signals index.
 *
 * @param soClient An {@link SavedObjectsClientContract}
 * @param index name(s) of the signals index(es)
 *
 * @returns a {@link MigrationsByIndex} object
 *
 * @throws if SO client returns an error
 */
export const getMigrations = async ({
  index,
  soClient,
}: {
  index: string[];
  soClient: SavedObjectsClientContract;
}): Promise<MigrationsByIndex> => {
  const migrations = await signalsMigrationService(soClient).find({
    search: index.join(' OR '),
    searchFields: ['sourceIndex'],
    sortField: 'updated',
    sortOrder: 'desc',
  });

  return migrations.reduce<MigrationsByIndex>((agg, migration) => {
    const { sourceIndex } = migration.attributes;
    return {
      ...agg,
      [sourceIndex]: [...(agg[sourceIndex] ?? []), migration],
    };
  }, {});
};

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
  const signalsVersionsByIndex = await getSignalsVersions({ esClient, index });

  return index.reduce<MigrationStatus[]>(
    (statuses, name) => [
      ...statuses,
      {
        name,
        signal_versions: signalsVersionsByIndex[name] ?? [],
        version: indexVersions[name]?.mappings?._meta?.version ?? 0,
      },
    ],
    []
  );
};
