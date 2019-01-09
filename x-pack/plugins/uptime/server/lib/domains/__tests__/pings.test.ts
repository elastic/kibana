/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Monitor, Ping } from '../../../../common/graphql/types';
import { compose } from '../../compose/test_compose';
import { UMServerLibs } from '../../lib';

describe('Pings domain lib', () => {
  describe('getAll', () => {
    let libs: UMServerLibs;
    let pingsDB: Ping[];
    beforeEach(async () => {
      pingsDB = [
        {
          timestamp: new Date(2018, 0, 1, 14, 14, 0, 0).toUTCString(),
          monitor: {
            id: 'foo',
          },
        },
        {
          timestamp: new Date(2018, 5, 1, 14, 14, 0, 0).toUTCString(),
          monitor: {
            id: 'bar',
          },
        },
        {
          timestamp: new Date(2018, 2, 2, 14, 14, 0, 0).toUTCString(),
          monitor: {
            id: 'baz',
          },
        },
      ];
      libs = compose({ pingsDB });
    });

    const testMonitorId = (expectedId: string, monitor?: Monitor | null) => {
      expect(monitor).not.toBeNull();
      expect(monitor && monitor.id).toBe(expectedId);
    };

    it('should sort asc and take a range', async () => {
      const request: any = {};
      const apiResponse = await libs.pings.getAll(
        request,
        100,
        200,
        undefined,
        undefined,
        'asc',
        2
      );
      expect(apiResponse.total).toBe(2);
      expect(apiResponse.pings).toHaveLength(2);
      testMonitorId('foo', apiResponse.pings[0].monitor);
      testMonitorId('baz', apiResponse.pings[1].monitor);
    });

    it('should sort desc and take a range', async () => {
      const apiResponse = await libs.pings.getAll(
        undefined,
        100,
        200,
        undefined,
        undefined,
        'desc',
        2
      );
      expect(apiResponse.total).toBe(2);
      expect(apiResponse.pings).toHaveLength(2);
      testMonitorId('bar', apiResponse.pings[0].monitor);
      testMonitorId('baz', apiResponse.pings[1].monitor);
    });

    it('should take range without sort', async () => {
      const apiResponse = await libs.pings.getAll(
        undefined,
        100,
        200,
        undefined,
        undefined,
        undefined,
        2
      );
      expect(apiResponse.total).toBe(2);
      expect(apiResponse.pings).toHaveLength(2);
      testMonitorId('foo', apiResponse.pings[0].monitor);
      testMonitorId('bar', apiResponse.pings[1].monitor);
    });

    it('should sort without range', async () => {
      const apiResponse = await libs.pings.getAll(
        undefined,
        100,
        200,
        undefined,
        undefined,
        'desc',
        undefined
      );
      expect(apiResponse.total).toBe(10);
      expect(apiResponse.pings).toHaveLength(3);
      testMonitorId('bar', apiResponse.pings[0].monitor);
      testMonitorId('baz', apiResponse.pings[1].monitor);
      testMonitorId('foo', apiResponse.pings[2].monitor);
    });

    it('should return unsorted, with default size of 10', async () => {
      const apiResponse = await libs.pings.getAll(
        undefined,
        100,
        200,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(apiResponse.total).toBe(10);
      expect(apiResponse.pings).toHaveLength(3);
      testMonitorId('foo', apiResponse.pings[0].monitor);
      testMonitorId('bar', apiResponse.pings[1].monitor);
      testMonitorId('baz', apiResponse.pings[2].monitor);
    });
  });
});
