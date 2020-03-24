/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchClusters } from './fetch_clusters';

describe('fetchClusters', () => {
  it('return a list of clusters', async () => {
    const callCluster = jest.fn().mockImplementation(() => ({
      aggregations: {
        clusters: {
          buckets: [
            {
              key: 'clusterA',
            },
          ],
        },
      },
    }));
    const index = '.monitoring-es-*';
    const result = await fetchClusters(callCluster, index);
    expect(result).toEqual([{ clusterUuid: 'clusterA' }]);
  });

  it('should limit the time period in the query', async () => {
    const callCluster = jest.fn();
    const index = '.monitoring-es-*';
    await fetchClusters(callCluster, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[1].range.timestamp.gte).toBe('now-2m');
  });
});
