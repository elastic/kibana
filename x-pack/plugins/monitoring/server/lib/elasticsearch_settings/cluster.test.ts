/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterGetSettingsResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { checkClusterSettings } from '.';
import { LegacyRequest } from '../../types';

describe('Elasticsearch Cluster Settings', () => {
  const makeResponse = (
    property: keyof ClusterGetSettingsResponse,
    response: any = {}
  ): ClusterGetSettingsResponse => {
    const result = {
      persistent: {},
      transient: {},
      defaults: {},
    };
    result[property] = response;
    return result;
  };

  const getReq = (response: ClusterGetSettingsResponse) => {
    return {
      server: {
        newPlatform: {
          setup: {
            plugins: {
              cloud: {
                isCloudEnabled: false,
              },
            },
          },
        },
        plugins: {
          elasticsearch: {
            getCluster() {
              return {
                callWithRequest: () => Promise.resolve(response),
              };
            },
          },
        },
      },
    } as unknown as LegacyRequest;
  };

  it('should find default collection interval reason', async () => {
    const setting = {
      xpack: { monitoring: { collection: { interval: -1 } } },
    };
    const makeExpected = (source: keyof ClusterGetSettingsResponse) => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: '-1',
        property: 'xpack.monitoring.collection.interval',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('defaults'));
  });

  it('should find exporters reason', async () => {
    const setting = {
      xpack: { monitoring: { exporters: { myCoolExporter: {} } } },
    };
    const makeExpected = (source: keyof ClusterGetSettingsResponse) => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: 'Remote exporters indicate a possible misconfiguration: myCoolExporter',
        property: 'xpack.monitoring.exporters',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('defaults'));
  });

  it('should find enabled reason', async () => {
    const setting = {
      xpack: { monitoring: { enabled: 'false' } },
    };
    const makeExpected = (source: keyof ClusterGetSettingsResponse) => ({
      found: true,
      reason: {
        context: `cluster ${source}`,
        data: 'false',
        property: 'xpack.monitoring.enabled',
      },
    });

    let mockReq;
    let result;

    mockReq = getReq(makeResponse('persistent', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('persistent'));

    mockReq = getReq(makeResponse('transient', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('transient'));

    mockReq = getReq(makeResponse('defaults', setting));
    result = await checkClusterSettings(mockReq);
    expect(result).toEqual(makeExpected('defaults'));
  });
});
