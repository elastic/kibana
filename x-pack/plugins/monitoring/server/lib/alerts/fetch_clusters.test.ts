/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import { elasticsearchServiceMock } from 'src/core/server/mocks';
import { fetchClusters } from './fetch_clusters';

describe('fetchClusters', () => {
  const clusterUuid = '1sdfds734';
  const clusterName = 'monitoring';

  it('return a list of clusters', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [
            {
              _source: {
                cluster_uuid: clusterUuid,
                cluster_name: clusterName,
              },
            },
          ],
        },
      } as estypes.SearchResponse)
    );
    const index = '.monitoring-es-*';
    const result = await fetchClusters(esClient, index);
    expect(result).toEqual([{ clusterUuid, clusterName }]);
  });

  it('return the metadata name if available', async () => {
    const metadataName = 'custom-monitoring';
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [
            {
              _source: {
                cluster_uuid: clusterUuid,
                cluster_name: clusterName,
                cluster_settings: {
                  cluster: {
                    metadata: {
                      display_name: metadataName,
                    },
                  },
                },
              },
            },
          ],
        },
      } as estypes.SearchResponse)
    );
    const index = '.monitoring-es-*';
    const result = await fetchClusters(esClient, index);
    expect(result).toEqual([{ clusterUuid, clusterName: metadataName }]);
  });

  it('should limit the time period in the query', async () => {
    const esClient = elasticsearchServiceMock.createScopedClusterClient().asCurrentUser;
    const index = '.monitoring-es-*';
    await fetchClusters(esClient, index);
    const params = esClient.search.mock.calls[0][0] as any;
    expect(params?.body?.query.bool.filter[1].range.timestamp.gte).toBe('now-2m');
  });
});
