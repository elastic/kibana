/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockLogger } from '../../__mocks__';

import { registerTelemetryUsageCollector } from './telemetry';

describe('Enterprise Search Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();
  const usageCollectionMock = {
    makeUsageCollector: makeUsageCollectorStub,
    registerCollector: registerStub,
  } as any;

  const savedObjectsRepoStub = {
    get: () => ({
      attributes: {
        'ui_viewed.overview': 10,
        'ui_clicked.app_search': 2,
        'ui_clicked.workplace_search': 3,
      },
    }),
    incrementCounter: jest.fn(),
  };
  const savedObjectsMock = {
    createInternalRepository: jest.fn(() => savedObjectsRepoStub),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryUsageCollector', () => {
    it('should make and register the usage collector', () => {
      registerTelemetryUsageCollector(usageCollectionMock, savedObjectsMock, mockLogger);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('enterprise_search');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return existing saved objects data', async () => {
      registerTelemetryUsageCollector(usageCollectionMock, savedObjectsMock, mockLogger);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          overview: 10,
        },
        ui_clicked: {
          app_search: 2,
          workplace_search: 3,
        },
      });
    });

    it('should return a default telemetry object if no saved data exists', async () => {
      const emptySavedObjectsMock = {
        createInternalRepository: () => ({
          get: () => ({ attributes: null }),
        }),
      } as any;

      registerTelemetryUsageCollector(usageCollectionMock, emptySavedObjectsMock, mockLogger);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          overview: 0,
        },
        ui_clicked: {
          app_search: 0,
          workplace_search: 0,
        },
      });
    });
  });
});
