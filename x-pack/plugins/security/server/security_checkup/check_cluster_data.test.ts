/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { createClusterDataCheck } from './check_cluster_data';

describe('checkClusterForUserData', () => {
  it('returns false if no data is found', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResponse([]);

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.cat.indices).toHaveBeenCalledTimes(1);
  });

  it('returns false if data only exists in system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResponse([
      {
        index: '.kibana',
        'docs.count': '500',
      },
      {
        index: 'kibana_sample_ecommerce_data',
        'docs.count': '20',
      },
      {
        index: '.somethingElse',
        'docs.count': '20',
      },
    ]);

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(false);
    expect(esClient.cat.indices).toHaveBeenCalledTimes(1);
  });

  it('returns true if data exists in non-system indices', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices.mockResponse([
      {
        index: '.kibana',
        'docs.count': '500',
      },
      {
        index: 'some_real_index',
        'docs.count': '20',
      },
    ]);

    const log = loggingSystemMock.createLogger();

    const response = await createClusterDataCheck()(esClient, log);
    expect(response).toEqual(true);
  });

  it('checks each time until the first true response is returned, then stops checking', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.cat.indices
      .mockResponseOnce([])
      .mockRejectedValueOnce(new Error('something terrible happened'))
      .mockResponseOnce([
        {
          index: '.kibana',
          'docs.count': '500',
        },
      ])
      .mockResponseOnce([
        {
          index: 'some_real_index',
          'docs.count': '20',
        },
      ]);

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

    expect(esClient.cat.indices).toHaveBeenCalledTimes(4);
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
    expect(esClient.cat.indices).toHaveBeenCalledTimes(4);
  });
});
