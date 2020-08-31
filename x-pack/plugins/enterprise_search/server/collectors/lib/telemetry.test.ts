/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockLogger } from '../../__mocks__';

jest.mock('../../../../../../src/core/server', () => ({
  SavedObjectsErrorHelpers: {
    isNotFoundError: jest.fn(),
  },
}));
import { SavedObjectsErrorHelpers } from '../../../../../../src/core/server';

import { getSavedObjectAttributesFromRepo, incrementUICounter } from './telemetry';

describe('App Search Telemetry Usage Collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSavedObjectAttributesFromRepo', () => {
    // Note: savedObjectsRepository.get() is best tested as a whole from
    // individual fetchTelemetryMetrics tests. This mostly just tests error handling
    it('should not throw but log a warning if saved objects errors', async () => {
      const errorSavedObjectsMock = {} as any;

      // Without log warning (not found)
      (SavedObjectsErrorHelpers.isNotFoundError as jest.Mock).mockImplementationOnce(() => true);
      await getSavedObjectAttributesFromRepo('some_id', errorSavedObjectsMock, mockLogger);

      expect(mockLogger.warn).not.toHaveBeenCalled();

      // With log warning
      (SavedObjectsErrorHelpers.isNotFoundError as jest.Mock).mockImplementationOnce(() => false);
      await getSavedObjectAttributesFromRepo('some_id', errorSavedObjectsMock, mockLogger);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to retrieve some_id telemetry data: TypeError: savedObjectsRepository.get is not a function'
      );
    });
  });

  describe('incrementUICounter', () => {
    const incrementCounterMock = jest.fn();
    const savedObjectsMock = {
      createInternalRepository: jest.fn(() => ({
        incrementCounter: incrementCounterMock,
      })),
    } as any;

    it('should increment the saved objects internal repository', async () => {
      const response = await incrementUICounter({
        id: 'app_search_telemetry',
        savedObjects: savedObjectsMock,
        uiAction: 'ui_clicked',
        metric: 'button',
      });

      expect(incrementCounterMock).toHaveBeenCalledWith(
        'app_search_telemetry',
        'app_search_telemetry',
        'ui_clicked.button'
      );
      expect(response).toEqual({ success: true });
    });
  });
});
