/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ESFilter } from '@kbn/es-types';
import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { Logger, ElasticsearchClient } from '@kbn/core/server';
import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

import type {
  BulkUpsertAssetCriticalityRecordsResponse,
  AssetCriticalityUpsert,
} from '../../../../common/entity_analytics/asset_criticality/types';
import type { AssetCriticalityRecord } from '../../../../common/api/entity_analytics';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { getAssetCriticalityIndex } from '../../../../common/entity_analytics/asset_criticality';
import type { CriticalityValues } from './constants';
import { CRITICALITY_VALUES, assetCriticalityFieldMap } from './constants';
import { AssetCriticalityAuditActions } from './audit';
import { AUDIT_CATEGORY, AUDIT_OUTCOME, AUDIT_TYPE } from '../audit';

interface AssetCriticalityClientOpts {
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  esClient: ElasticsearchClient;
  namespace: string;
}

type AssetCriticalityIdParts = Pick<AssetCriticalityUpsert, 'idField' | 'idValue'>;

type BulkUpsertFromStreamOptions = {
  recordsStream: NodeJS.ReadableStream;
} & Pick<Parameters<ElasticsearchClient['helpers']['bulk']>[0], 'flushBytes' | 'retries'>;

type StoredAssetCriticalityRecord = {
  [K in keyof AssetCriticalityRecord]: K extends 'criticality_level'
    ? CriticalityValues
    : AssetCriticalityRecord[K];
};

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

    this.options.auditLogger?.log({
      message: 'User installed asset criticality Elasticsearch resources',
      event: {
        action: AssetCriticalityAuditActions.ASSET_CRITICALITY_INITIALIZE,
        category: AUDIT_CATEGORY.DATABASE,
        type: AUDIT_TYPE.CREATION,
        outcome: AUDIT_OUTCOME.SUCCESS,
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
    size = DEFAULT_CRITICALITY_RESPONSE_SIZE,
    from,
    sort,
  }: {
    query: ESFilter;
    size?: number;
    from?: number;
    sort?: SearchRequest['sort'];
  }): Promise<SearchResponse<AssetCriticalityRecord>> {
    const response = await this.options.esClient.search<AssetCriticalityRecord>({
      index: this.getIndex(),
      ignore_unavailable: true,
      query,
      size: Math.min(size, MAX_CRITICALITY_RESPONSE_SIZE),
      from,
      sort,
      post_filter: {
        bool: {
          must_not: {
            term: { criticality_level: CRITICALITY_VALUES.DELETED },
          },
        },
      },
    });
    return response;
  }

  public async searchByKuery({
    kuery,
    size,
    from,
    sort,
  }: {
    kuery?: string;
    size?: number;
    from?: number;
    sort?: SearchRequest['sort'];
  }) {
    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };

    return this.search({
      query,
      size,
      from,
      sort,
    });
  }

  private getIndex() {
    return getAssetCriticalityIndex(this.options.namespace);
  }

  public async doesIndexExist() {
    try {
      const result = await this.options.esClient.indices.exists({
        index: this.getIndex(),
      });

      this.options.auditLogger?.log({
        message: 'User checked if the asset criticality Elasticsearch resources were installed',
        event: {
          action: AssetCriticalityAuditActions.ASSET_CRITICALITY_INITIALIZE,
          category: AUDIT_CATEGORY.DATABASE,
          type: AUDIT_TYPE.ACCESS,
          outcome: AUDIT_OUTCOME.SUCCESS,
        },
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
      const { _source: doc } = await this.options.esClient.get<StoredAssetCriticalityRecord>({
        id,
        index: this.getIndex(),
      });

      if (doc?.criticality_level === CRITICALITY_VALUES.DELETED) {
        return undefined;
      }

      return doc as AssetCriticalityRecord;
    } catch (err) {
      if (err.statusCode === 404) {
        return undefined;
      } else {
        throw err;
      }
    }
  }

  public async upsert(
    record: AssetCriticalityUpsert,
    refresh = 'wait_for' as const
  ): Promise<AssetCriticalityRecord> {
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
      refresh: refresh ?? false,
      body: {
        doc,
        doc_as_upsert: true,
      },
    });

    return doc;
  }

  /**
   * Bulk upsert asset criticality records from a stream.
   * @param recordsStream a stream of records to upsert, records may also be an error e.g if there was an error parsing
   * @param flushBytes how big elasticsearch bulk requests should be before they are sent
   * @param retries the number of times to retry a failed bulk request
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
    flushBytes,
    retries,
  }: BulkUpsertFromStreamOptions): Promise<BulkUpsertAssetCriticalityRecordsResponse> => {
    const errors: BulkUpsertAssetCriticalityRecordsResponse['errors'] = [];
    const stats: BulkUpsertAssetCriticalityRecordsResponse['stats'] = {
      successful: 0,
      failed: 0,
      total: 0,
    };

    let streamIndex = 0;
    const recordGenerator = async function* () {
      for await (const untypedRecord of recordsStream) {
        const record = untypedRecord as unknown as AssetCriticalityUpsert | Error;
        stats.total++;
        if (record instanceof Error) {
          stats.failed++;
          errors.push({
            message: record.message,
            index: streamIndex,
          });
        } else {
          yield {
            record,
            index: streamIndex,
          };
        }
        streamIndex++;
      }
    };

    const { failed, successful } = await this.options.esClient.helpers.bulk({
      datasource: recordGenerator(),
      index: this.getIndex(),
      flushBytes,
      retries,
      refreshOnCompletion: true, // refresh the index after all records are processed
      onDocument: ({ record }) => [
        { update: { _id: createId(record) } },
        {
          doc: {
            id_field: record.idField,
            id_value: record.idValue,
            criticality_level: record.criticalityLevel,
            '@timestamp': new Date().toISOString(),
          },
          doc_as_upsert: true,
        },
      ],
      onDrop: ({ document, error }) => {
        errors.push({
          message: error?.reason || 'Unknown error',
          index: document.index,
        });
      },
    });

    stats.successful += successful;
    stats.failed += failed;

    return { errors, stats };
  };

  public async delete(
    idParts: AssetCriticalityIdParts,
    refresh = 'wait_for' as const
  ): Promise<AssetCriticalityRecord | undefined> {
    let record: AssetCriticalityRecord | undefined;
    try {
      record = await this.get(idParts);
    } catch (err) {
      if (err.statusCode === 404) {
        return undefined;
      } else {
        throw err;
      }
    }

    if (!record) {
      return undefined;
    }

    if (record.id_value === 'deleted') {
      return undefined;
    }

    try {
      await this.options.esClient.update({
        id: createId(idParts),
        index: this.getIndex(),
        refresh: refresh ?? false,
        doc: {
          criticality_level: 'deleted',
        },
      });
    } catch (err) {
      this.options.logger.error(`Failed to delete asset criticality record: ${err.message}`);
      throw err;
    }

    return record;
  }

  public formatSearchResponse(response: SearchResponse<AssetCriticalityRecord>): {
    records: AssetCriticalityRecord[];
    total: number;
  } {
    const records = response.hits.hits.map((hit) => hit._source as AssetCriticalityRecord);
    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      records,
      total,
    };
  }
}
