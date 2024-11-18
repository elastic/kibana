/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { Readable } from 'stream';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';
import type { AssetCriticalityUpsert } from '../../../../common/entity_analytics/asset_criticality/types';
import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

type MockInternalEsClient = ReturnType<
  typeof elasticsearchServiceMock.createScopedClusterClient
>['asInternalUser'];
jest.mock('../utils/create_or_update_index', () => ({
  createOrUpdateIndex: jest.fn(),
}));

describe('AssetCriticalityDataClient', () => {
  const esClientInternal = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const logger = loggingSystemMock.createLogger();
  const mockAuditLogger = auditLoggerMock.create();

  describe('init', () => {
    it('ensures the index is available and up to date', async () => {
      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient: esClientInternal,
        logger,
        namespace: 'default',
        auditLogger: mockAuditLogger,
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
              asset: {
                properties: {
                  criticality: {
                    type: 'keyword',
                  },
                },
              },
              host: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
              user: {
                properties: {
                  asset: {
                    properties: {
                      criticality: {
                        type: 'keyword',
                      },
                    },
                  },
                  name: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        },
      });
    });
  });

  describe('#search()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('searches in the asset criticality index', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ index: '.asset-criticality.asset-criticality-default' })
      );
    });

    // QUESTION: This test seems useless?
    it('requires a query parameter', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: { match_all: {} } })
      );
    });

    it('accepts a from parameter', async () => {
      await subject.search({ query: { match_all: {} }, from: 100 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ from: 100 }));
    });

    it('accepts a sort parameter', async () => {
      await subject.search({ query: { match_all: {} }, sort: [{ '@timestamp': 'asc' }] });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: [{ '@timestamp': 'asc' }] })
      );
    });

    it('accepts a size parameter', async () => {
      await subject.search({ query: { match_all: {} }, size: 100 });

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: 100 }));
    });

    it('defaults to the default query size', async () => {
      await subject.search({ query: { match_all: {} } });
      const defaultSize = 1_000;

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ size: defaultSize })
      );
    });

    it('caps the size to the maximum query size', async () => {
      await subject.search({ query: { match_all: {} }, size: 999999 });
      const maxSize = 100_000;

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: maxSize }));
    });

    it('ignores an index_not_found_exception if the criticality index does not exist', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ ignore_unavailable: true })
      );
    });
  });

  describe('#upsert()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('created "host" records in the asset criticality index', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'host.name',
        idValue: 'host1',
        criticalityLevel: 'high_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'host.name:host1',
          index: '.asset-criticality.asset-criticality-default',
          body: {
            doc: {
              id_field: 'host.name',
              id_value: 'host1',
              criticality_level: 'high_impact',
              '@timestamp': expect.any(String),
              asset: {
                criticality: 'high_impact',
              },
              host: {
                name: 'host1',
                asset: {
                  criticality: 'high_impact',
                },
              },
            },
            doc_as_upsert: true,
          },
        })
      );
    });

    it('created "user" records in the asset criticality index', async () => {
      const record: AssetCriticalityUpsert = {
        idField: 'user.name',
        idValue: 'user1',
        criticalityLevel: 'medium_impact',
      };

      await subject.upsert(record);

      expect(esClientMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user.name:user1',
          index: '.asset-criticality.asset-criticality-default',
          body: {
            doc: {
              id_field: 'user.name',
              id_value: 'user1',
              criticality_level: 'medium_impact',
              '@timestamp': expect.any(String),
              asset: {
                criticality: 'medium_impact',
              },
              user: {
                name: 'user1',
                asset: {
                  criticality: 'medium_impact',
                },
              },
            },
            doc_as_upsert: true,
          },
        })
      );
    });
  });

  describe('#bulkUpsertFromStream()', () => {
    let esClientMock: MockInternalEsClient;
    let loggerMock: ReturnType<typeof loggingSystemMock.createLogger>;
    let subject: AssetCriticalityDataClient;

    beforeEach(() => {
      esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;

      esClientMock.helpers.bulk = mockEsBulk();
      loggerMock = loggingSystemMock.createLogger();
      subject = new AssetCriticalityDataClient({
        esClient: esClientMock,
        logger: loggerMock,
        namespace: 'default',
        auditLogger: mockAuditLogger,
      });
    });

    it('returns valid stats', async () => {
      const recordsStream = [
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
      ];

      const result = await subject.bulkUpsertFromStream({
        recordsStream: Readable.from(recordsStream),
        retries: 3,
        flushBytes: 1_000,
      });

      expect(result).toEqual({
        errors: [],
        stats: {
          failed: 0,
          successful: 1,
          total: 1,
        },
      });
    });

    it('returns error for duplicated entities', async () => {
      const recordsStream = [
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
        { idField: 'host.name', idValue: 'host1', criticalityLevel: 'high_impact' },
      ];

      const result = await subject.bulkUpsertFromStream({
        recordsStream: Readable.from(recordsStream),
        retries: 3,
        flushBytes: 1_000,
        streamIndexStart: 9,
      });

      expect(result).toEqual({
        errors: [
          {
            index: 10,
            message: 'Duplicated entity',
          },
        ],
        stats: {
          failed: 1,
          successful: 1,
          total: 2,
        },
      });
    });
  });
});

const mockEsBulk = () =>
  jest.fn().mockImplementation(async ({ datasource }) => {
    let count = 0;
    for await (const _ of datasource) {
      count++;
    }
    return {
      failed: 0,
      successful: count,
    };
  }) as unknown as ElasticsearchClientMock['helpers']['bulk'];
