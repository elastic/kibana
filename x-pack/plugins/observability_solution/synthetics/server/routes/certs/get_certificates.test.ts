/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as getAllMonitors from '../../saved_objects/synthetics_monitor/get_all_monitors';
import * as getCerts from '../../queries/get_certs';
import { getSyntheticsCertsRoute } from './get_certificates';

describe('getSyntheticsCertsRoute', () => {
  let getMonitorsSpy: jest.SpyInstance;

  beforeEach(() => {
    getMonitorsSpy = jest.spyOn(getAllMonitors, 'getAllMonitors').mockReturnValue([] as any);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns empty set when no monitors are found', async () => {
    const route = getSyntheticsCertsRoute();
    expect(
      await route.handler({
        // @ts-expect-error partial implementation for testing
        request: { query: {} },
        // @ts-expect-error partial implementation for testing
        syntheticsEsClient: jest.fn(),
        savedObjectClient: jest.fn(),
      })
    ).toEqual({
      data: {
        certs: [],
        total: 0,
      },
    });
    expect(getMonitorsSpy).toHaveBeenCalledTimes(1);
  });

  it('returns cert data when monitors are found', async () => {
    const getMonitorsResult = [
      {
        id: 'test-id',
        monitor: {
          type: 'browser',
          name: 'test-monitor',
          enabled: true,
          schedule: {
            interval: 1,
            timezone: 'UTC',
          },
        },
      },
    ] as any;
    const processMonitorsSpy = jest.spyOn(getAllMonitors, 'processMonitors').mockReturnValue({
      // @ts-expect-error partial implementation for testing
      enableMonitorQueryIds: ['test-id'],
    });
    const getCertsResult = {
      total: 1,
      certs: [
        {
          monitors: [
            {
              name: 'test-monitor',
              id: 'test-id',
              configId: 'test-id',
              url: 'https://elastic.co',
            },
          ],
          sha256: 'some-hash',
          configId: 'test-id',
        },
      ],
    };
    const getSyntheticsCertsSpy = jest
      .spyOn(getCerts, 'getSyntheticsCerts')
      // @ts-expect-error partial implementation for testing
      .mockReturnValue(getCertsResult);
    const route = getSyntheticsCertsRoute();
    getMonitorsSpy.mockReturnValue(getMonitorsResult);
    const result = await route.handler({
      // @ts-expect-error partial implementation for testing
      request: { query: {} },
      // @ts-expect-error partial implementation for testing
      syntheticsEsClient: jest.fn(),
      savedObjectClient: jest.fn(),
    });
    expect(getMonitorsSpy).toHaveBeenCalledTimes(1);
    expect(processMonitorsSpy).toHaveBeenCalledTimes(1);
    expect(processMonitorsSpy).toHaveBeenCalledWith(getMonitorsResult);
    expect(getSyntheticsCertsSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { ...getCertsResult } });
  });
});
