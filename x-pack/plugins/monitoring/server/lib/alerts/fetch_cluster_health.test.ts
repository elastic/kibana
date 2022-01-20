/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '../../../../../../src/core/server/elasticsearch/client/mocks';
import { fetchClusterHealth } from './fetch_cluster_health';

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

describe('fetchClusterHealth', () => {
  it('should return the cluster health', async () => {
    const status = 'green';
    const clusterUuid = 'sdfdsaj34434';
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: [
            {
              _index: '.monitoring-es-7',
              _source: {
                cluster_state: {
                  status,
                },
                cluster_uuid: clusterUuid,
              },
            },
          ],
        },
      } as estypes.SearchResponse)
    );

    const clusters = [{ clusterUuid, clusterName: 'foo' }];

    const health = await fetchClusterHealth(esClient, clusters);
    expect(health).toEqual([
      {
        health: status,
        clusterUuid,
        ccs: undefined,
      },
    ]);
  });
});
