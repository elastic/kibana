/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTelemetryUsageCollector, incrementUICounter } from './telemetry';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the lib/telemetry tests.
 */
describe('App Search Telemetry Usage Collector', () => {
  const makeUsageCollectorStub = jest.fn();
  const registerStub = jest.fn();

  const savedObjectsRepoStub = {
    get: () => ({
      attributes: {
        'ui_viewed.setup_guide': 10,
        'ui_viewed.engines_overview': 20,
        'ui_error.cannot_connect': 3,
        'ui_error.no_as_account': 4,
        'ui_clicked.header_launch_button': 50,
        'ui_clicked.engine_table_link': 60,
      },
    }),
    incrementCounter: jest.fn(),
  };
  const dependencies = {
    usageCollection: {
      makeUsageCollector: makeUsageCollectorStub,
      registerCollector: registerStub,
    },
    savedObjects: {
      createInternalRepository: jest.fn(() => savedObjectsRepoStub),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerTelemetryUsageCollector', () => {
    it('should make and register the usage collector', () => {
      registerTelemetryUsageCollector(dependencies);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('app_search');
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return existing saved objects data', async () => {
      registerTelemetryUsageCollector(dependencies);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          setup_guide: 10,
          engines_overview: 20,
        },
        ui_error: {
          cannot_connect: 3,
          no_as_account: 4,
        },
        ui_clicked: {
          header_launch_button: 50,
          engine_table_link: 60,
        },
      });
    });

    it('should not error & should return a default telemetry object if no saved data exists', async () => {
      registerTelemetryUsageCollector({
        ...dependencies,
        savedObjects: { createInternalRepository: () => ({}) },
      });
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          setup_guide: 0,
          engines_overview: 0,
        },
        ui_error: {
          cannot_connect: 0,
          no_as_account: 0,
        },
        ui_clicked: {
          header_launch_button: 0,
          engine_table_link: 0,
        },
      });
    });
  });

  describe('incrementUICounter', () => {
    it('should increment the saved objects internal repository', async () => {
      const { savedObjects } = dependencies;

      const response = await incrementUICounter({
        savedObjects,
        uiAction: 'ui_clicked',
        metric: 'button',
      });

      expect(savedObjectsRepoStub.incrementCounter).toHaveBeenCalledWith(
        'app_search_telemetry',
        'app_search_telemetry',
        'ui_clicked.button'
      );
      expect(response).toEqual({ success: true });
    });
  });
});
