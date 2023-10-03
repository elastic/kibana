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

function createAssetClient(metricsDataClient: MetricsDataClient) {
  return new AssetClient({
    sourceIndices: {
      logs: 'my-logs*',
    },
    getApmIndices: jest.fn(),
    metricsClient: metricsDataClient,
  });
}

describe('Public assets client', () => {
  let metricsDataClientMock: MetricsDataClient = MetricsDataClientMock.create();
  let esClientMock: ElasticsearchClientMock =
    elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    // Reset mocks
    esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    soClientMock = savedObjectsClientMock.create();
    metricsDataClientMock = MetricsDataClientMock.create();

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
      createAssetClient(metricsDataClientMock);
    });
  });

  describe('getHosts', () => {
    it('should query Elasticsearch correctly', async () => {
      const client = createAssetClient(metricsDataClientMock);

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
  });
});
