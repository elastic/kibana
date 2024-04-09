/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '@kbn/es-types';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type {
  AssetCriticalityCsvUploadResponse,
  AssetCriticalityUpsert,
} from '../../../../common/entity_analytics/asset_criticality/types';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
import { assetCriticalityFieldMap } from './constants';

interface AssetCriticalityClientOpts {
  logger: Logger;
  esClient: ElasticsearchClient;
  namespace: string;
}

type AssetCriticalityIdParts = Pick<AssetCriticalityUpsert, 'idField' | 'idValue'>;

const MAX_CRITICALITY_RESPONSE_SIZE = 100_000;
const DEFAULT_CRITICALITY_RESPONSE_SIZE = 1_000;

const createId = ({ idField, idValue }: AssetCriticalityIdParts) => `${idField}:${idValue}`;

export class AssetCriticalityDataClient {
  constructor(private readonly options: AssetCriticalityClientOpts) {}
  /**
   * It will create idex for asset criticality,
   * or update mappings if index exists
   */
  public async init() {
    await createOrUpdateIndex({
      esClient: this.options.esClient,
      logger: this.options.logger,
      options: {
        index: this.getIndex(),
        mappings: mappingFromFieldMap(assetCriticalityFieldMap, 'strict'),
      },
    });
  }

  /**
   *
   * A general method for searching asset criticality records.
   * @param query an ESL query to filter criticality results
   * @param size the maximum number of records to return. Cannot exceed {@link MAX_CRITICALITY_RESPONSE_SIZE}. If unspecified, will default to {@link DEFAULT_CRITICALITY_RESPONSE_SIZE}.
   * @returns criticality records matching the query
   */
  public async search({
    query,
    size,
  }: {
    query: ESFilter;
    size?: number;
  }): Promise<SearchResponse<AssetCriticalityRecord>> {
    const response = await this.options.esClient.search<AssetCriticalityRecord>({
      index: this.getIndex(),
      ignore_unavailable: true,
      body: { query },
      size: Math.min(size ?? DEFAULT_CRITICALITY_RESPONSE_SIZE, MAX_CRITICALITY_RESPONSE_SIZE),
    });
    return response;
  }

  private getIndex() {
    return getAssetCriticalityIndex(this.options.namespace);
  }

  public async doesIndexExist() {
    try {
      const result = await this.options.esClient.indices.exists({
        index: this.getIndex(),
      });
      return result;
    } catch (e) {
      return false;
    }
  }

  public async getStatus() {
    const isAssetCriticalityResourcesInstalled = await this.doesIndexExist();

    return {
      isAssetCriticalityResourcesInstalled,
    };
  }

  public async get(idParts: AssetCriticalityIdParts): Promise<AssetCriticalityRecord | undefined> {
    const id = createId(idParts);

    try {
      const body = await this.options.esClient.get<AssetCriticalityRecord>({
        id,
        index: this.getIndex(),
      });

      return body._source;
    } catch (err) {
      if (err.statusCode === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  public async upsert(record: AssetCriticalityUpsert): Promise<AssetCriticalityRecord> {
    const id = createId(record);
    const doc = {
      id_field: record.idField,
      id_value: record.idValue,
      criticality_level: record.criticalityLevel,
      '@timestamp': new Date().toISOString(),
    };

    await this.options.esClient.update({
      id,
      index: this.getIndex(),
      body: {
        doc,
        doc_as_upsert: true,
      },
    });

    return doc;
  }

  public async bulkUpsert(
    records: AssetCriticalityUpsert[]
  ): Promise<
    Array<
      | { id: string; error: string }
      | { record: AssetCriticalityRecord; result: 'created' | 'updated' }
    >
  > {
    if (records.length === 0) {
      return [];
    }

    const docs = records.map((record) => ({
      _id: createId(record),
      doc: {
        id_field: record.idField,
        id_value: record.idValue,
        criticality_level: record.criticalityLevel,
        '@timestamp': new Date().toISOString(),
      },
    }));

    const body = docs.flatMap(({ doc, _id }) => [
      { update: { _id } },
      { doc, doc_as_upsert: true },
    ]);

    const response = await this.options.esClient.bulk({
      body,
      index: this.getIndex(),
    });

    return response.items.map((item, index) => {
      const doc = docs[index];
      if (item.update && item.update.error) {
        return { id: doc._id, error: item.update.error.reason || item.update.error.type };
      } else {
        if (item?.update?.result === 'created') {
          return { record: doc.doc, result: 'created' };
        }
        return { record: doc.doc, result: 'updated' };
      }
    });
  }

  /**
   * Bulk upsert asset criticality records from a stream.
   * @param recordsStream a stream of records to upsert, records may also be an error e.g if there was an error parsing
   * @param batchSize the number of records to upsert in a single batch
   * @returns an object containing the number of records updated, created, errored, and the total number of records processed
   * @throws an error if the stream emits an error
   * @remarks
   * - The stream must emit records in the format of {@link AssetCriticalityUpsert} or an error instance
   * - The stream must emit records in the order they should be upserted
   * - The stream must emit records in a valid JSON format
   * - We allow errors to be emitted in the stream to allow for partial upserts and to maintain the order of records
   **/
  public bulkUpsertFromStream = async ({
    recordsStream,
    batchSize,
  }: {
    recordsStream: NodeJS.ReadableStream;
    batchSize: number;
  }): Promise<AssetCriticalityCsvUploadResponse> => {
    const errors: AssetCriticalityCsvUploadResponse['errors'] = [];
    const stats: AssetCriticalityCsvUploadResponse['stats'] = {
      updated: 0,
      created: 0,
      errors: 0,
      total: 0,
    };

    const batchPomises: Array<Promise<void>> = [];

    async function* recordsGenerator(): AsyncGenerator<
      AssetCriticalityUpsert | Error,
      void,
      undefined
    > {
      for await (const record of recordsStream) {
        yield record as unknown as AssetCriticalityUpsert | Error;
      }
    }

    const processBatch = async (
      batch: Array<{ record: AssetCriticalityUpsert; index: number }>
    ) => {
      if (batch.length === 0) {
        return;
      }
      try {
        const upsertResult = await this.bulkUpsert(batch.map((b) => b.record));
        const startIndex = batch[0].index;
        upsertResult.forEach((result, resultIndex) => {
          if ('error' in result) {
            errors.push({
              message: result.error,
              index: startIndex + resultIndex,
            });
            stats.errors++;
          } else {
            stats[result.result]++;
          }
        });
      } catch (error) {
        for (const b of batch) {
          errors.push({
            message: error.message,
            index: b.index,
          });
          stats.errors++;
        }
      }
    };

    const gen = recordsGenerator();
    let index = 0;
    let currentBatch: Array<{ record: AssetCriticalityUpsert; index: number }> = [];

    for await (const record of gen) {
      stats.total++;
      if (record instanceof Error) {
        stats.errors++;
        errors.push({
          message: record.message,
          index,
        });
      } else {
        currentBatch.push({ record, index });
        if (currentBatch.length === batchSize) {
          batchPomises.push(processBatch(currentBatch));
          currentBatch = [];
        }
      }
      index++;
    }

    if (currentBatch.length > 0) {
      batchPomises.push(processBatch(currentBatch));
    }

    await Promise.all(batchPomises);

    return { errors, stats };
  };

  public async delete(idParts: AssetCriticalityIdParts) {
    await this.options.esClient.delete({
      id: createId(idParts),
      index: this.getIndex(),
    });
  }
}
