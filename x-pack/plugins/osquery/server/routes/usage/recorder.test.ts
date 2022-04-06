/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '../../../../../../src/core/server/mocks';

import { usageMetricSavedObjectType } from '../../../common/types';

import {
  CounterValue,
  getOrCreateMetricObject,
  getRouteMetric,
  incrementCount,
  RouteString,
  routeStrings,
} from './recorder';

const savedObjectsClient = savedObjectsClientMock.create();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkGetCalls(calls: any[]) {
  expect(calls.length).toEqual(routeStrings.length);
  for (let i = 0; i < routeStrings.length; ++i) {
    expect(calls[i]).toEqual([usageMetricSavedObjectType, routeStrings[i]]);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function checkCreateCalls(calls: any[], expectedCallRoutes: string[] = routeStrings) {
  expect(calls.length).toEqual(expectedCallRoutes.length);
  for (let i = 0; i < expectedCallRoutes.length; ++i) {
    expect(calls[i][0]).toEqual(usageMetricSavedObjectType);
    expect(calls[i][2].id).toEqual(expectedCallRoutes[i]);
  }
}

describe('Usage metric recorder', () => {
  describe('Metric initalizer', () => {
    const get = savedObjectsClient.get as jest.Mock;
    const create = savedObjectsClient.create as jest.Mock;
    afterEach(() => {
      get.mockClear();
      create.mockClear();
    });
    it('should create metrics that do not exist', async () => {
      get.mockRejectedValueOnce('stub value');
      create.mockReturnValueOnce('stub value');
      const result = await getOrCreateMetricObject(savedObjectsClient, 'live_query');
      checkGetCalls(get.mock.calls);
      checkCreateCalls(create.mock.calls);
      expect(result).toBe('stub value');
    });

    it('should handle previously created objects properly', async () => {
      get.mockReturnValueOnce('stub value');
      create.mockRejectedValueOnce('stub value');
      const result = await getOrCreateMetricObject(savedObjectsClient, 'live_query');
      checkGetCalls(get.mock.calls);
      checkCreateCalls(create.mock.calls, []);
      expect(result).toBe('stub value');
    });
  });

  describe('Incrementation', () => {
    let counterMap: { [key: string]: CounterValue };
    const get = savedObjectsClient.get as jest.Mock;
    const update = savedObjectsClient.update as jest.Mock;
    update.mockImplementation(
      async (objectType: string, route: RouteString, newVal: CounterValue) => {
        counterMap[`${objectType}-${route}`] = newVal;
      }
    );
    get.mockImplementation(async (objectType: string, route: RouteString) => ({
      attributes: counterMap[`${objectType}-${route}`],
    }));
    beforeEach(() => {
      counterMap = routeStrings.reduce((acc, route) => {
        acc[`${usageMetricSavedObjectType}-${route}`] = {
          count: 0,
          errors: 0,
        };

        return acc;
      }, {} as { [key: string]: CounterValue });
      get.mockClear();
      update.mockClear();
    });
    it('should increment the route counter', async () => {
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 0,
        errors: 0,
      });
      await incrementCount(savedObjectsClient, 'live_query');
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 1,
        errors: 0,
      });
    });

    it('should allow incrementing the error counter', async () => {
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 0,
        errors: 0,
      });
      await incrementCount(savedObjectsClient, 'live_query', 'errors');
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 0,
        errors: 1,
      });
    });

    it('should allow adjustment of the increment', async () => {
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 0,
        errors: 0,
      });
      await incrementCount(savedObjectsClient, 'live_query', 'count', 2);
      expect(await getRouteMetric(savedObjectsClient, 'live_query')).toEqual({
        count: 2,
        errors: 0,
      });
    });
  });
});
