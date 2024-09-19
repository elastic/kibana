/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { EntityStoreDataClient } from './entity_store_data_client';
import { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';

describe('EntityStoreDataClient', () => {
  const logger = loggingSystemMock.createLogger();
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const esClientMock = elasticsearchServiceMock.createScopedClusterClient().asInternalUser;
  const loggerMock = loggingSystemMock.createLogger();
  const dataClient = new EntityStoreDataClient({
    esClient: esClientMock,
    logger: loggerMock,
    namespace: 'default',
    soClient: mockSavedObjectClient,
    entityClient: new EntityClient({
      esClient: esClientMock,
      soClient: mockSavedObjectClient,
      logger,
    }),
  });

  const defaultSearchParams = {
    entityTypes: ['host'] as EntityType[],
    page: 1,
    perPage: 10,
    sortField: 'hostName',
    sortOrder: 'asc' as SortOrder,
  };

  describe('search entities', () => {
    beforeEach(() => {
      jest.resetAllMocks();
      esClientMock.search.mockResolvedValue({
        took: 0,
        timed_out: false,
        _shards: {
          total: 0,
          successful: 0,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: 0,
          hits: [],
        },
      });
    });

    it('searches in the entities store indices', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        entityTypes: ['host', 'user'],
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            '.entities.v1.latest.ea_host_entity_store',
            '.entities.v1.latest.ea_user_entity_store',
          ],
        })
      );
    });

    it('should filter by filterQuery param', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        filterQuery: '{"match_all":{}}',
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: { bool: { filter: [{ match_all: {} }] } } })
      );
    });

    it('should paginate', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        page: 3,
        perPage: 7,
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ from: 14, size: 7 })
      );
    });

    it('should sort', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        sortField: '@timestamp',
        sortOrder: 'asc',
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: [{ '@timestamp': 'asc' }] })
      );
    });

    it('caps the size to the maximum query size', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        perPage: 999_999,
      });

      const maxSize = 10_000;

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: maxSize }));
    });

    it('ignores an index_not_found_exception if the entity index does not exist', async () => {
      await dataClient.searchEntities(defaultSearchParams);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ ignore_unavailable: true })
      );
    });

    it('returns inspect query params', async () => {
      const response = await dataClient.searchEntities(defaultSearchParams);

      expect(response.inspect).toMatchSnapshot();
    });
  });
});
