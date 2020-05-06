/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingServiceMock, savedObjectsServiceMock } from 'src/core/server/mocks';
import { MockRouter } from '../__mocks__/router.mock';

import { registerTelemetryRoute } from './telemetry';

jest.mock('../../collectors/app_search/telemetry', () => ({
  incrementUICounter: jest.fn(),
}));
import { incrementUICounter } from '../../collectors/app_search/telemetry';

describe('App Search Telemetry API', () => {
  const mockRouter = new MockRouter({ method: 'put', payload: 'body' });
  const mockLogger = loggingServiceMock.create().get();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.createRouter();

    registerTelemetryRoute({
      router: mockRouter.router,
      getSavedObjectsService: () => savedObjectsServiceMock.create(),
      log: mockLogger,
    });
  });

  describe('PUT /api/app_search/telemetry', () => {
    it('increments the saved objects counter', async () => {
      const successResponse = { success: true };
      incrementUICounter.mockImplementation(jest.fn(() => successResponse));

      await mockRouter.callRoute({ body: { action: 'viewed', metric: 'setup_guide' } });

      expect(incrementUICounter).toHaveBeenCalledWith({
        savedObjects: expect.any(Object),
        uiAction: 'ui_viewed',
        metric: 'setup_guide',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: successResponse });
    });

    it('throws an error when incrementing fails', async () => {
      incrementUICounter.mockImplementation(jest.fn(() => Promise.reject('Failed')));

      await mockRouter.callRoute({ body: { action: 'error', metric: 'error' } });

      expect(incrementUICounter).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRouter.response.internalError).toHaveBeenCalled();
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = { body: { action: 'viewed', metric: 'setup_guide' } };
        mockRouter.shouldValidate(request);
      });

      it('wrong action string', () => {
        const request = { body: { action: 'invalid', metric: 'setup_guide' } };
        mockRouter.shouldThrow(request);
      });

      describe('wrong metric type', () => {
        const request = { body: { action: 'clicked', metric: true } };
        mockRouter.shouldThrow(request);
      });

      describe('action is missing', () => {
        const request = { body: { metric: 'engines_overview' } };
        mockRouter.shouldThrow(request);
      });

      describe('metric is missing', () => {
        const request = { body: { action: 'error' } };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
