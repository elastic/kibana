/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { AssetCriticalityDataClient } from './asset_criticality_data_client';
import { createOrUpdateIndex } from '../utils/create_or_update_index';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

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

    it('requires a query parameter', async () => {
      await subject.search({ query: { match_all: {} } });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ body: { query: { match_all: {} } } })
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
});
