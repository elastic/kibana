/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';
import { SignalsMigrationSO } from './saved_objects_schema';
import { signalsMigrationSOService } from './saved_objects_service';
import {
  Bucket,
  IndexMappingsResponse,
  MigrationStatus,
  MigrationStatusSearchResponse,
} from './types';

interface SignalsVersionsByIndex {
  [indexName: string]: Bucket[] | undefined;
}

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

export const getMigrations = async ({
  index,
  soClient,
}: {
  index: string[];
  soClient: SavedObjectsClientContract;
}): Promise<MigrationsByIndex> => {
  const migrations = await signalsMigrationSOService(soClient).find({
    search: index.join(' OR '),
    searchFields: ['sourceIndex'],
    sortField: 'updated',
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
  soClient,
}: {
  esClient: ElasticsearchClient;
  index: string[];
  soClient: SavedObjectsClientContract;
}): Promise<MigrationStatus[]> => {
  if (index.length === 0) {
    return [];
  }

  const { body: indexVersions } = await esClient.indices.getMapping<IndexMappingsResponse>({
    index,
  });
  const signalsVersionsByIndex = await getSignalsVersions({ esClient, index });
  const migrationsByIndex = await getMigrations({ index, soClient });

  return index.reduce<MigrationStatus[]>(
    (statuses, name) => [
      ...statuses,
      {
        migrations: migrationsByIndex[name]?.map((m) => m.id) ?? [],
        name,
        signal_versions: signalsVersionsByIndex[name] ?? [],
        version: indexVersions[name]?.mappings?._meta?.version ?? 0,
      },
    ],
    []
  );
};
