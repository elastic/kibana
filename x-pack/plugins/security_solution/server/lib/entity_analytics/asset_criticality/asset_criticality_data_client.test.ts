/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';

import { createOrUpdateIndex } from '../utils/create_or_update_index';
import type { AssetCriticalityUpsert } from '../../../../common/entity_analytics/asset_criticality/types';
import { Readable } from 'node:stream';

jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));

const createBulkResponseFromRecords = (records: AssetCriticalityUpsert[]) => {
  return {
    errors: false,
    took: 54,
    items: records.map((record) => {
      return {
        update: {
          _index: '.asset-criticality.asset-criticality-default',
          _id: record.idValue,
          _version: 1,
          result: 'updated',
          _shards: {
            total: 2,
            successful: 1,
            failed: 0,
          },
          status: 200,
          _seq_no: 1,
          _primary_term: 1,
        },
      };
    }),
  };
};

describe('AssetCriticalityDataClient', () => {
  const esClientInternal = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const logger = loggingSystemMock.createLogger();
  describe('init', () => {
    it('ensures the index is available and up to date', async () => {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient: esClientInternal,
        logger,
        namespace: 'default',
      });

      await assetCriticalityDataClient.init();

      expect(createOrUpdateIndex).toHaveBeenCalledWith({
        esClient: esClientInternal,
        logger,
        options: {
          index: '.asset-criticality.asset-criticality-default',
          mappings: {
            dynamic: 'strict',
            properties: {
              id_field: {
                type: 'keyword',
              },
              id_value: {
                type: 'keyword',
              },
              criticality_level: {
                type: 'keyword',
              },
              '@timestamp': {
                type: 'date',
                ignore_malformed: false,
              },
              updated_at: {
                type: 'date',
              },
            },
          },
        },
      });
    });
  });

  describe('#search()', () => {
    let esClientMock: ReturnType<
      typeof elasticsearchServiceMock.createScopedClusterClient
    >['asInternalUser'];
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
      });
    });

    it('searches in the asset criticality index', async () => {
      subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.asset-criticality.asset-criticality-default' })
      );
    });

    it('requires a query parameter', async () => {
      subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ body: { query: { match_all: {} } } })
      );
    });

    it('accepts a size parameter', async () => {
      subject.search({ query: { match_all: {} }, size: 100 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
    });

    it('defaults to the default query size', async () => {
      subject.search({ query: { match_all: {} } });
      const defaultSize = 1_000;

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: defaultSize })
      );
    });

    it('caps the size to the maximum query size', async () => {
      subject.search({ query: { match_all: {} }, size: 999999 });
      const maxSize = 100_000;

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: maxSize }));
    });

    it('ignores an index_not_found_exception if the criticality index does not exist', async () => {
      subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ ignore_unavailable: true })
      );
    });
  });

  describe('bulkUpsert', () => {
    it('should call bulkUpsert and preserve record order', async () => {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient: esClientInternal,
        logger,
        namespace: 'default',
      });

      const records: AssetCriticalityUpsert[] = [
        {
          idField: 'host.name',
          idValue: 'host-1',
          criticalityLevel: 'low_impact',
        },
        {
          idField: 'host.name',
          idValue: 'host-2',
          criticalityLevel: 'high_impact',
        },
      ];

      esClientInternal.bulk.mockResolvedValue(createBulkResponseFromRecords(records));

      const res = await assetCriticalityDataClient.bulkUpsert(records);

      expect(esClientInternal.bulk).toHaveBeenCalled();

      expect(res).toEqual([
        {
          record: {
            '@timestamp': expect.any(String),
            criticality_level: 'low_impact',
            id_field: 'host.name',
            id_value: 'host-1',
          },
          result: 'updated',
        },
        {
          record: {
            '@timestamp': expect.any(String),
            criticality_level: 'high_impact',
            id_field: 'host.name',
            id_value: 'host-2',
          },
          result: 'updated',
        },
      ]);
    });
  });

  describe('bulkUpsertFromStream', () => {
    it('should call bulkUpsert and preserve record order', async () => {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient: esClientInternal,
        logger,
        namespace: 'default',
      });

      const records: AssetCriticalityUpsert[] = [
        {
          idField: 'host.name',
          idValue: 'host-1',
          criticalityLevel: 'low_impact',
        },
        {
          idField: 'host.name',
          idValue: 'host-2',
          criticalityLevel: 'high_impact',
        },
      ];

      records.forEach((record) => {
        esClientInternal.bulk.mockResolvedValueOnce(createBulkResponseFromRecords([record]));
      });

      const recordsStream = new Readable({
        objectMode: true,
        read() {
          records.forEach((record) => {
            this.push(record);
          });
          this.push(null);
        },
      });

      const res = await assetCriticalityDataClient.bulkUpsertFromStream({
        recordsStream,
        batchSize: 1,
      });

      expect(esClientInternal.bulk).toHaveBeenCalled();

      expect(res).toEqual({
        errors: [],
        stats: {
          created: 0,
          updated: 2,
          errors: 0,
          total: 2,
        },
      });
    });
  });
});
