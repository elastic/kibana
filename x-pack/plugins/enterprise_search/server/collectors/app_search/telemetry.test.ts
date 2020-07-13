/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock } from 'src/core/server/mocks';

jest.mock('../../../../../../src/core/server', () => ({
  SavedObjectsErrorHelpers: {
    isNotFoundError: jest.fn(),
  },
}));
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';

import { registerTelemetryUsageCollector, incrementUICounter } from './telemetry';

describe('App Search Telemetry Usage Collector', () => {
  const mockLogger = loggingSystemMock.create().get();

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

    it('should not throw but log a warning if saved objects errors', async () => {
      const errorSavedObjectsMock = { createInternalRepository: () => ({}) } as any;
      registerTelemetryUsageCollector(usageCollectionMock, errorSavedObjectsMock, mockLogger);

      // Without log warning (not found)
      (SavedObjectsErrorHelpers.isNotFoundError as jest.Mock).mockImplementationOnce(() => true);
      await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(mockLogger.warn).not.toHaveBeenCalled();

      // With log warning
      (SavedObjectsErrorHelpers.isNotFoundError as jest.Mock).mockImplementationOnce(() => false);
      await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to retrieve App Search telemetry data: TypeError: savedObjectsRepository.get is not a function'
      );
    });
  });

  describe('incrementUICounter', () => {
    it('should increment the saved objects internal repository', async () => {
      const response = await incrementUICounter({
        savedObjects: savedObjectsMock,
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
