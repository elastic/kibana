/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { createClusterDataCheck } from './check_cluster_data';

describe('checkClusterForUserData', () => {
  it('returns false if no data is found', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.stats.mockResponse({
      _shards: { failed: 0, successful: 1, total: 1 },
      _all: {},
    });

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.indices.stats).toHaveBeenCalledTimes(1);
  });

  it('returns false if data only exists in system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    esClient.indices.stats.mockResponse(
      mockIndicesStatsResponseFactory([
        { name: '.kibana', count: 500 },
        { name: 'kibana_sample_ecommerce_data', count: 20 },
        { name: '.somethingElse', count: 20 },
      ])
    );

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.indices.stats).toHaveBeenCalledTimes(1);
  });

  it('returns true if data exists in non-system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    esClient.indices.stats.mockResponse(
      mockIndicesStatsResponseFactory([
        { name: '.kibana', count: 500 },
        { name: 'some_real_index', count: 20 },
      ])
    );

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(true);
  });

  it('checks each time until the first true response is returned, then stops checking', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();

    esClient.indices.stats
      .mockResponseOnce(mockIndicesStatsResponseFactory([]))
      .mockRejectedValueOnce(new Error('something terrible happened'))
      .mockResponseOnce(mockIndicesStatsResponseFactory([{ name: '.kibana', count: 20 }]))
      .mockResponseOnce(mockIndicesStatsResponseFactory([{ name: 'some_real_index', count: 20 }]));

    const log = loggingSystemMock.createLogger();

    const doesClusterHaveUserData = createClusterDataCheck();

    let response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(false);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(true);

    expect(esClient.indices.stats).toHaveBeenCalledTimes(4);

    expect(log.warn.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "Error encountered while checking cluster for user data: Error: something terrible happened",
        ],
      ]
    `);

    response = await doesClusterHaveUserData(esClient, log);
    expect(response).toEqual(true);
    // Same number of calls as above. We should not have to interrogate again.
    expect(esClient.indices.stats).toHaveBeenCalledTimes(4);
  });
});

function mockIndicesStatsResponseFactory(
  listOfIndicesWithCount: Array<{ name: string; count: number }>
): IndicesStatsResponse {
  const result: IndicesStatsResponse = {
    _shards: { failed: 0, successful: 1, total: 1 },
    _all: {},
    indices: {},
  };

  listOfIndicesWithCount.forEach((indexPair) => {
    result!.indices![indexPair.name] = {
      total: { docs: { count: indexPair.count } },
    };
  });

  return result;
}
