/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockLogger } from '../../__mocks__';

import { registerTelemetryUsageCollector } from './telemetry';

describe('App Search Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();
  const usageCollectionMock = {
    makeUsageCollector: makeUsageCollectorStub,
    registerCollector: registerStub,
  } as any;

  const savedObjectsRepoStub = {
    get: () => ({
      attributes: {
        'ui_viewed.setup_guide': 10,
        'ui_viewed.engines_overview': 20,
        'ui_error.cannot_connect': 3,
        'ui_clicked.create_first_engine_button': 40,
        'ui_clicked.header_launch_button': 50,
        'ui_clicked.engine_table_link': 60,
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
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('app_search');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return existing saved objects data', async () => {
      registerTelemetryUsageCollector(usageCollectionMock, savedObjectsMock, mockLogger);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          setup_guide: 10,
          engines_overview: 20,
        },
        ui_error: {
          cannot_connect: 3,
        },
        ui_clicked: {
          create_first_engine_button: 40,
          header_launch_button: 50,
          engine_table_link: 60,
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
          setup_guide: 0,
          engines_overview: 0,
        },
        ui_error: {
          cannot_connect: 0,
        },
        ui_clicked: {
          create_first_engine_button: 0,
          header_launch_button: 0,
          engine_table_link: 0,
        },
      });
    });
  });
});
