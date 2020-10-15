/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { fetchAvailableCcs } from './fetch_available_ccs';

describe('fetchAvailableCcs', () => {
  it('should call the `cluster.remoteInfo` api', async () => {
    const callCluster = jest.fn();
    await fetchAvailableCcs(callCluster);
    expect(callCluster).toHaveBeenCalledWith('cluster.remoteInfo');
  });

  it('should return clusters that are connected', async () => {
    const connectedRemote = 'myRemote';
    const callCluster = jest.fn().mockImplementation(() => ({
      [connectedRemote]: {
        connected: true,
      },
    }));
    const result = await fetchAvailableCcs(callCluster);
    expect(result).toEqual([connectedRemote]);
  });

  it('should not return clusters that are connected', async () => {
    const disconnectedRemote = 'myRemote';
    const callCluster = jest.fn().mockImplementation(() => ({
      [disconnectedRemote]: {
        connected: false,
      },
    }));
    const result = await fetchAvailableCcs(callCluster);
    expect(result.length).toBe(0);
  });
});
