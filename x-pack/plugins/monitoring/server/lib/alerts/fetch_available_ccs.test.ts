/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
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
      Promise.resolve({
        [connectedRemote]: {
          connected: true,
        } as estypes.ClusterRemoteInfoClusterRemoteInfo,
      })
    );

    const result = await fetchAvailableCcs(esClient);
    expect(result).toEqual([connectedRemote]);
  });

  it('should not return clusters that are connected', async () => {
    const disconnectedRemote = 'myRemote';
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.cluster.remoteInfo.mockImplementation(() =>
      Promise.resolve({
        [disconnectedRemote]: {
          connected: false,
        } as estypes.ClusterRemoteInfoClusterRemoteInfo,
      })
    );

    const result = await fetchAvailableCcs(esClient);
    expect(result.length).toBe(0);
  });
});
