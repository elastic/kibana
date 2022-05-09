/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { getESClusterUuid } from '.';

describe('getESClusterUuid', () => {
  it('should return the result of the es client call', async () => {
    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    // @ts-ignore
    esClientMock.asCurrentUser.info.mockImplementation(() => {
      return { cluster_uuid: '1abc' };
    });
    const clusterUuid = await getESClusterUuid(esClientMock);
    expect(esClientMock.asCurrentUser.info).toHaveBeenCalledWith({ filter_path: 'cluster_uuid' });
    expect(clusterUuid).toBe('1abc');
  });

  it('should fail gracefully if an error is thrown at the ES level', async () => {
    const esClientMock = elasticsearchClientMock.createScopedClusterClient();
    // @ts-ignore
    esClientMock.asCurrentUser.info.mockImplementation(() => {
      return undefined;
    });
    const clusterUuid = await getESClusterUuid(esClientMock);
    expect(esClientMock.asCurrentUser.info).toHaveBeenCalledWith({ filter_path: 'cluster_uuid' });
    expect(clusterUuid).toBeUndefined();
  });
});
