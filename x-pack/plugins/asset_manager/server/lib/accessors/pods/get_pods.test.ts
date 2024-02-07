/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { GetApmIndicesMethod } from '../../asset_client_types';
import { getPods } from './get_pods';
import {
  createGetApmIndicesMock,
  expectToThrowValidationErrorWithStatusCode,
} from '../../../test_utils';
import { MetricsDataClient, MetricsDataClientMock } from '@kbn/metrics-data-access-plugin/server';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';

function createBaseOptions({
  getApmIndicesMock,
  metricsDataClientMock,
}: {
  getApmIndicesMock: GetApmIndicesMethod;
  metricsDataClientMock: MetricsDataClient;
}) {
  return {
    sourceIndices: {
      logs: 'my-logs*',
    },
    getApmIndices: getApmIndicesMock,
    metricsClient: metricsDataClientMock,
  };
}

describe('getPods', () => {
  let getApmIndicesMock = createGetApmIndicesMock();
  let metricsDataClientMock = MetricsDataClientMock.create();
  let baseOptions = createBaseOptions({ getApmIndicesMock, metricsDataClientMock });
  let esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
  let soClientMock = savedObjectsClientMock.create();

  function resetMocks() {
    getApmIndicesMock = createGetApmIndicesMock();
    metricsDataClientMock = MetricsDataClientMock.create();
    baseOptions = createBaseOptions({ getApmIndicesMock, metricsDataClientMock });
    esClientMock = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    soClientMock = savedObjectsClientMock.create();
  }

  beforeEach(() => {
    resetMocks();

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

  it('should query Elasticsearch correctly', async () => {
    await getPods({
      ...baseOptions,
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
          field: 'kubernetes.pod.uid',
        },
      },
      {
        exists: {
          field: 'kubernetes.node.name',
        },
      },
    ]);
  });

  it('should correctly include an EAN filter as a pod ID term query', async () => {
    const mockPodId = '123abc';

    await getPods({
      ...baseOptions,
      from: 'now-1h',
      elasticsearchClient: esClientMock,
      savedObjectsClient: soClientMock,
      filters: {
        ean: `pod:${mockPodId}`,
      },
    });

    const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
    const { bool } = dsl?.query || {};
    expect(bool).toBeDefined();

    expect(bool?.must).toEqual(
      expect.arrayContaining([
        {
          exists: {
            field: 'kubernetes.pod.uid',
          },
        },
        {
          exists: {
            field: 'kubernetes.node.name',
          },
        },
        {
          term: {
            'kubernetes.pod.uid': mockPodId,
          },
        },
      ])
    );
  });

  it('should not query ES and return empty if filtering on non-pod EAN', async () => {
    const mockId = 'some-id-123';

    const result = await getPods({
      ...baseOptions,
      from: 'now-1h',
      elasticsearchClient: esClientMock,
      savedObjectsClient: soClientMock,
      filters: {
        ean: `container:${mockId}`,
      },
    });

    expect(esClientMock.search).toHaveBeenCalledTimes(0);
    expect(result).toEqual({ pods: [] });
  });

  it('should include a wildcard ID filter when an ID filter is provided with asterisks included', async () => {
    const mockIdPattern = '*partial-id*';

    await getPods({
      ...baseOptions,
      from: 'now-1h',
      elasticsearchClient: esClientMock,
      savedObjectsClient: soClientMock,
      filters: {
        id: mockIdPattern,
      },
    });

    const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
    const { bool } = dsl?.query || {};
    expect(bool).toBeDefined();

    expect(bool?.must).toEqual(
      expect.arrayContaining([
        {
          exists: {
            field: 'kubernetes.pod.uid',
          },
        },
        {
          exists: {
            field: 'kubernetes.node.name',
          },
        },
        {
          wildcard: {
            'kubernetes.pod.uid': mockIdPattern,
          },
        },
      ])
    );
  });

  it('should include a term ID filter when an ID filter is provided without asterisks included', async () => {
    const mockId = 'full-id';

    await getPods({
      ...baseOptions,
      from: 'now-1h',
      elasticsearchClient: esClientMock,
      savedObjectsClient: soClientMock,
      filters: {
        id: mockId,
      },
    });

    const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
    const { bool } = dsl?.query || {};
    expect(bool).toBeDefined();

    expect(bool?.must).toEqual(
      expect.arrayContaining([
        {
          exists: {
            field: 'kubernetes.pod.uid',
          },
        },
        {
          exists: {
            field: 'kubernetes.node.name',
          },
        },
        {
          term: {
            'kubernetes.pod.uid': mockId,
          },
        },
      ])
    );
  });

  it('should include a term filter for cloud filters', async () => {
    const mockCloudProvider = 'gcp';
    const mockCloudRegion = 'us-central-1';

    await getPods({
      ...baseOptions,
      from: 'now-1h',
      elasticsearchClient: esClientMock,
      savedObjectsClient: soClientMock,
      filters: {
        'cloud.provider': mockCloudProvider,
        'cloud.region': mockCloudRegion,
      },
    });

    const dsl = esClientMock.search.mock.lastCall?.[0] as SearchRequest | undefined;
    const { bool } = dsl?.query || {};
    expect(bool).toBeDefined();

    expect(bool?.must).toEqual(
      expect.arrayContaining([
        {
          exists: {
            field: 'kubernetes.pod.uid',
          },
        },
        {
          exists: {
            field: 'kubernetes.node.name',
          },
        },
        {
          term: {
            'cloud.provider': mockCloudProvider,
          },
        },
        {
          term: {
            'cloud.region': mockCloudRegion,
          },
        },
      ])
    );
  });

  it('should reject with 400 for invalid "from" date', () => {
    return expectToThrowValidationErrorWithStatusCode(
      () =>
        getPods({
          ...baseOptions,
          from: 'now-1zz',
          to: 'now-3d',
          elasticsearchClient: esClientMock,
          savedObjectsClient: soClientMock,
        }),
      { statusCode: 400 }
    );
  });

  it('should reject with 400 for invalid "to" date', () => {
    return expectToThrowValidationErrorWithStatusCode(
      () =>
        getPods({
          ...baseOptions,
          from: 'now-5d',
          to: 'now-3fe',
          elasticsearchClient: esClientMock,
          savedObjectsClient: soClientMock,
        }),
      { statusCode: 400 }
    );
  });

  it('should reject with 400 when "from" is a date that is after "to"', () => {
    return expectToThrowValidationErrorWithStatusCode(
      () =>
        getPods({
          ...baseOptions,
          from: 'now',
          to: 'now-5d',
          elasticsearchClient: esClientMock,
          savedObjectsClient: soClientMock,
        }),
      { statusCode: 400 }
    );
  });

  it('should reject with 400 when "from" is in the future', () => {
    return expectToThrowValidationErrorWithStatusCode(
      () =>
        getPods({
          ...baseOptions,
          from: 'now+1d',
          elasticsearchClient: esClientMock,
          savedObjectsClient: soClientMock,
        }),
      { statusCode: 400 }
    );
  });
});
