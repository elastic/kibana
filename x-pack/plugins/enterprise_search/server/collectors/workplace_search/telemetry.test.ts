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
describe('Workplace Search Telemetry Usage Collector', () => {
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
        'ui_viewed.overview': 20,
        'ui_error.cannot_connect': 3,
        'ui_error.no_ws_account': 4,
        'ui_clicked.header_launch_button': 30,
        'ui_clicked.org_name_change_button': 40,
        'ui_clicked.onboarding_card_button': 50,
        'ui_clicked.recent_activity_source_details_link': 60,
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
      registerTelemetryUsageCollector(usageCollectionMock, savedObjectsMock);

      expect(registerStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub).toHaveBeenCalledTimes(1);
      expect(makeUsageCollectorStub.mock.calls[0][0].type).toBe('workplace_search');
      expect(makeUsageCollectorStub.mock.calls[0][0].isReady()).toBe(true);
    });
  });

  describe('fetchTelemetryMetrics', () => {
    it('should return existing saved objects data', async () => {
      registerTelemetryUsageCollector(usageCollectionMock, savedObjectsMock);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          setup_guide: 10,
          overview: 20,
        },
        ui_error: {
          cannot_connect: 3,
          no_ws_account: 4,
        },
        ui_clicked: {
          header_launch_button: 30,
          org_name_change_button: 40,
          onboarding_card_button: 50,
          recent_activity_source_details_link: 60,
        },
      });
    });

    it('should not error & should return a default telemetry object if no saved data exists', async () => {
      const emptySavedObjectsMock = { createInternalRepository: () => ({}) } as any;

      registerTelemetryUsageCollector(usageCollectionMock, emptySavedObjectsMock);
      const savedObjectsCounts = await makeUsageCollectorStub.mock.calls[0][0].fetch();

      expect(savedObjectsCounts).toEqual({
        ui_viewed: {
          setup_guide: 0,
          overview: 0,
        },
        ui_error: {
          cannot_connect: 0,
          no_ws_account: 0,
        },
        ui_clicked: {
          header_launch_button: 0,
          org_name_change_button: 0,
          onboarding_card_button: 0,
          recent_activity_source_details_link: 0,
        },
      });
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
        'workplace_search_telemetry',
        'workplace_search_telemetry',
        'ui_clicked.button'
      );
      expect(response).toEqual({ success: true });
    });
  });
});
