/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fetchLicenses } from './fetch_licenses';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      config: {
        ui: {
          ccs: { enabled: true },
        },
      },
    },
  },
}));

describe('fetchLicenses', () => {
  const clusterName = 'MyCluster';
  const clusterUuid = 'clusterA';
  const license = {
    status: 'active',
    expiry_date_in_millis: 1579532493876,
    type: 'basic',
  };

  it('return a list of licenses', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [
            {
              _source: {
                license,
                cluster_uuid: clusterUuid,
              },
            },
          ],
        },
      } as estypes.SearchResponse)
    );
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    const result = await fetchLicenses(esClient, clusters, index);
    expect(result).toEqual([
      {
        status: license.status,
        type: license.type,
        expiryDateMS: license.expiry_date_in_millis,
        clusterUuid,
      },
    ]);
  });

  it('should only search for the clusters provided', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    await fetchLicenses(esClient, clusters, index);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[0].terms.cluster_uuid).toEqual([clusterUuid]);
  });

  it('should limit the time period in the query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    await fetchLicenses(esClient, clusters, index);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[2].range.timestamp.gte).toBe('now-2m');
  });
});
