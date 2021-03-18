/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchAvailableCcs } from './fetch_available_ccs';

describe('fetchAvailableCcs', () => {
  it('should call the `cluster.remoteInfo` api', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;

    await fetchAvailableCcs(esClient);
    expect(esClient.cluster.remoteInfo).toHaveBeenCalled();
  });

  it('should return clusters that are connected', async () => {
    const connectedRemote = 'myRemote';
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.cluster.remoteInfo.mockImplementation(() =>
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        [connectedRemote]: {
          connected: true,
        },
      })
    );

    const result = await fetchAvailableCcs(esClient);
    expect(result).toEqual([connectedRemote]);
  });

  it('should not return clusters that are connected', async () => {
    const disconnectedRemote = 'myRemote';
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.cluster.remoteInfo.mockImplementation(() =>
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        [disconnectedRemote]: {
          connected: false,
        },
      })
    );

    const result = await fetchAvailableCcs(esClient);
    expect(result.length).toBe(0);
  });
});
