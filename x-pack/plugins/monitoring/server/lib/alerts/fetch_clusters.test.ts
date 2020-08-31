/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchClusters } from './fetch_clusters';

describe('fetchClusters', () => {
  const clusterUuid = '1sdfds734';
  const clusterName = 'monitoring';

  it('return a list of clusters', async () => {
    const callCluster = jest.fn().mockImplementation(() => ({
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
    }));
    const index = '.monitoring-es-*';
    const result = await fetchClusters(callCluster, index);
    expect(result).toEqual([{ clusterUuid, clusterName }]);
  });

  it('return the metadata name if available', async () => {
    const metadataName = 'custom-monitoring';
    const callCluster = jest.fn().mockImplementation(() => ({
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
    }));
    const index = '.monitoring-es-*';
    const result = await fetchClusters(callCluster, index);
    expect(result).toEqual([{ clusterUuid, clusterName: metadataName }]);
  });

  it('should limit the time period in the query', async () => {
    const callCluster = jest.fn();
    const index = '.monitoring-es-*';
    await fetchClusters(callCluster, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[1].range.timestamp.gte).toBe('now-2m');
  });
});
