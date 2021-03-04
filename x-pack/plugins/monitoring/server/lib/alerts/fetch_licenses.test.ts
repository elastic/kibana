/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fetchLicenses } from './fetch_licenses';

describe('fetchLicenses', () => {
  const clusterName = 'MyCluster';
  const clusterUuid = 'clusterA';
  const license = {
    status: 'active',
    expiry_date_in_millis: 1579532493876,
    type: 'basic',
  };

  it('return a list of licenses', async () => {
    const callCluster = jest.fn().mockImplementation(() => ({
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
    }));
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    const result = await fetchLicenses(callCluster, clusters, index);
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
    const callCluster = jest.fn();
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    await fetchLicenses(callCluster, clusters, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[0].terms.cluster_uuid).toEqual([clusterUuid]);
  });

  it('should limit the time period in the query', async () => {
    const callCluster = jest.fn();
    const clusters = [{ clusterUuid, clusterName }];
    const index = '.monitoring-es-*';
    await fetchLicenses(callCluster, clusters, index);
    const params = callCluster.mock.calls[0][1];
    expect(params.body.query.bool.filter[2].range.timestamp.gte).toBe('now-2m');
  });
});
