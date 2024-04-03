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
import type { AssetCriticalityUpsert } from './types';
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
        } else {
          return { record: doc.doc, result: 'updated' };
        }
      }
    });
  }

  public bulkUpsertFromStream = async ({
    recordsStream,
    batchSize,
  }: {
    recordsStream: NodeJS.ReadableStream;
    batchSize: number;
  }): Promise<{
    errors: Array<{ message: string; index: number }>;
    results: {
      updated: number;
      created: number;
      errors: number;
      total: number;
    };
  }> => {
    return new Promise((resolve, reject) => {
      let index = 0;
      let currentBatch: Array<{ record: AssetCriticalityUpsert; index: number }> = [];
      const errors: Array<{ index: number; message: string }> = [];
      const results = { updated: 0, created: 0, errors: 0, total: 0 };
      const batchPromises: Array<Promise<void>> = [];

      const upsertBatch = async (
        batch: Array<{ record: AssetCriticalityUpsert; index: number }>
      ) => {
        if (batch.length === 0) {
          return;
        }

        try {
          const upsertResult = await this.bulkUpsert(batch.map((b) => b.record));
          const startIndex = batch[0].index;
          upsertResult.forEach((result, resultIndex) => {
            results.total++;
            if ('error' in result) {
              errors.push({
                message: result.error,
                index: startIndex + resultIndex,
              });
              results.errors++;
            } else {
              results[result.result]++;
            }
          });
        } catch (error) {
          batch.forEach((b) => {
            errors.push({
              message: error.message,
              index: b.index,
            });
          });
          results.errors += batch.length;
        }
      };

      const processRecord = (record: AssetCriticalityUpsert | Error) => {
        if (record instanceof Error) {
          errors.push({
            message: record.message,
            index,
          });
          return;
        }

        const batchRecord = { record, index };
        currentBatch.push(batchRecord);

        if (currentBatch.length === batchSize) {
          batchPromises.push(upsertBatch(currentBatch));
          currentBatch = [];
        }
        index++;
      };

      const finish = async () => {
        if (currentBatch.length > 0) {
          batchPromises.push(upsertBatch(currentBatch));
        }

        await Promise.all(batchPromises);
        resolve({ errors, results });
      };

      recordsStream.on('data', processRecord).on('end', finish).on('error', reject);
    });
  };

  public async delete(idParts: AssetCriticalityIdParts) {
    await this.options.esClient.delete({
      id: createId(idParts),
      index: this.getIndex(),
    });
  }
}
