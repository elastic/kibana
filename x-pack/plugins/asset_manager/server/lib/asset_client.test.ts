/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClientMock,
  elasticsearchClientMock,
} from '@kbn/core-elasticsearch-client-server-mocks';
import { AssetClient } from './asset_client';
import { MetricsDataClient, MetricsDataClientMock } from '@kbn/metrics-data-access-plugin/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { AssetsValidationError } from './validators/validation_error';
import { GetApmIndicesMethod } from './asset_client_types';

// Helper function allows test to verify error was thrown,
// verify error is of the right class type, and error has
// the expected metadata such as statusCode on it
function expectToThrowValidationErrorWithStatusCode(
  testFn: () => Promise<any>,
  expectedError: Partial<AssetsValidationError> = {}
) {
  return expect(async () => {
    try {
      return await testFn();
    } catch (error: any) {
      if (error instanceof AssetsValidationError) {
        if (expectedError.statusCode) {
          expect(error.statusCode).toEqual(expectedError.statusCode);
        }
        if (expectedError.message) {
          expect(error.message).toEqual(expect.stringContaining(expectedError.message));
        }
      }
      throw error;
    }
  }).rejects.toThrow(AssetsValidationError);
}

function createGetApmIndicesMock(): jest.Mocked<GetApmIndicesMethod> {
  return jest.fn(async (client: SavedObjectsClientContract) => ({
    transaction: 'apm-mock-transaction-indices',
    span: 'apm-mock-span-indices',
    error: 'apm-mock-error-indices',
    metric: 'apm-mock-metric-indices',
    onboarding: 'apm-mock-onboarding-indices',
    sourcemap: 'apm-mock-sourcemap-indices',
  }));
}

function createAssetClient(
  metricsDataClient: MetricsDataClient,
  getApmIndicesMock: jest.Mocked<GetApmIndicesMethod>
) {
  return new AssetClient({
    sourceIndices: {
      logs: 'my-logs*',
    },
    getApmIndices: getApmIndicesMock,
    metricsClient: metricsDataClient,
  });
}

describe('Server assets client', () => {
  let metricsDataClientMock: MetricsDataClient = MetricsDataClientMock.create();
  let getApmIndicesMock: jest.Mocked<GetApmIndicesMethod> = createGetApmIndicesMock();
  let esClientMock: ElasticsearchClientMock =
    elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    // Reset mocks
    esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    soClientMock = savedObjectsClientMock.create();
    metricsDataClientMock = MetricsDataClientMock.create();
    getApmIndicesMock = createGetApmIndicesMock();

    // ES returns no results, just enough structure to not blow up
    esClientMock.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: {
        failed: 0,
        successful: 1,
        total: 1,
      },
      hits: {
        hits: [],
      },
    });
  });

  describe('class instantiation', () => {
    it('should successfully instantiate', () => {
      createAssetClient(metricsDataClientMock, getApmIndicesMock);
    });
  });

  describe('getHosts', () => {
    it('should query Elasticsearch correctly', async () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      await client.getHosts({
        from: 'now-5d',
        to: 'now-3d',
        elasticsearchClient: esClientMock,
        savedObjectsClient: soClientMock,
      });

      expect(metricsDataClientMock.getMetricIndices).toHaveBeenCalledTimes(1);
      expect(metricsDataClientMock.getMetricIndices).toHaveBeenCalledWith({
        savedObjectsClient: soClientMock,
      });

      const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
      const { bool } = dsl?.query || {};
      expect(bool).toBeDefined();

      expect(bool?.filter).toEqual([
        {
          range: {
            '@timestamp': {
              gte: 'now-5d',
              lte: 'now-3d',
            },
          },
        },
      ]);

      expect(bool?.must).toEqual([
        {
          exists: {
            field: 'host.hostname',
          },
        },
      ]);

      expect(bool?.should).toEqual([
        { exists: { field: 'kubernetes.node.name' } },
        { exists: { field: 'kubernetes.pod.uid' } },
        { exists: { field: 'container.id' } },
      ]);
    });

    it('should reject with 400 for invalid "from" date', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getHosts({
            from: 'now-1zz',
            to: 'now-3d',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });

    it('should reject with 400 for invalid "to" date', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getHosts({
            from: 'now-5d',
            to: 'now-3fe',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });

    it('should reject with 400 when "from" is a date that is after "to"', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getHosts({
            from: 'now',
            to: 'now-5d',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });

    it('should reject with 400 when "from" is in the future', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getHosts({
            from: 'now+1d',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });
  });

  describe('getServices', () => {
    it('should query Elasticsearch correctly', async () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      await client.getServices({
        from: 'now-5d',
        to: 'now-3d',
        elasticsearchClient: esClientMock,
        savedObjectsClient: soClientMock,
      });

      expect(getApmIndicesMock).toHaveBeenCalledTimes(1);
      expect(getApmIndicesMock).toHaveBeenCalledWith(soClientMock);

      const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
      const { bool } = dsl?.query || {};
      expect(bool).toBeDefined();

      expect(bool?.filter).toEqual([
        {
          range: {
            '@timestamp': {
              gte: 'now-5d',
              lte: 'now-3d',
            },
          },
        },
      ]);

      expect(bool?.must).toEqual([
        {
          exists: {
            field: 'service.name',
          },
        },
      ]);

      expect(bool?.should).toBeUndefined();
    });

    it('should reject with 400 for invalid "from" date', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expect(() =>
        client.getServices({
          from: 'now-1zz',
          to: 'now-3d',
          elasticsearchClient: esClientMock,
          savedObjectsClient: soClientMock,
        })
      ).rejects.toThrow(AssetsValidationError);
    });

    it('should reject with 400 for invalid "to" date', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getServices({
            from: 'now-5d',
            to: 'now-3fe',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });

    it('should reject with 400 when "from" is a date that is after "to"', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getServices({
            from: 'now',
            to: 'now-5d',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });

    it('should reject with 400 when "from" is in the future', () => {
      const client = createAssetClient(metricsDataClientMock, getApmIndicesMock);

      return expectToThrowValidationErrorWithStatusCode(
        () =>
          client.getServices({
            from: 'now+1d',
            elasticsearchClient: esClientMock,
            savedObjectsClient: soClientMock,
          }),
        { statusCode: 400 }
      );
    });
  });
});
