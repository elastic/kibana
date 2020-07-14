/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock, savedObjectsServiceMock } from 'src/core/server/mocks';
import { MockRouter, mockConfig, mockLogger } from '../__mocks__';

import { registerTelemetryRoute } from './telemetry';

jest.mock('../../collectors/app_search/telemetry', () => ({
  incrementUICounter: jest.fn(),
}));
import { incrementUICounter } from '../../collectors/app_search/telemetry';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the collector functions correctly. Business logic
 * is tested more thoroughly in the collectors/telemetry tests.
 */
describe('App Search Telemetry API', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = new MockRouter({ method: 'put', payload: 'body' });

    registerTelemetryRoute({
      router: mockRouter.router,
      getSavedObjectsService: () => savedObjectsServiceMock.createStartContract(),
      log: mockLogger,
      config: mockConfig,
    });
  });

  describe('PUT /api/app_search/telemetry', () => {
    it('increments the saved objects counter', async () => {
      const successResponse = { success: true };
      (incrementUICounter as jest.Mock).mockImplementation(jest.fn(() => successResponse));

      await mockRouter.callRoute({ body: { action: 'viewed', metric: 'setup_guide' } });

      expect(incrementUICounter).toHaveBeenCalledWith({
        savedObjects: expect.any(Object),
        uiAction: 'ui_viewed',
        metric: 'setup_guide',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: successResponse });
    });

    it('throws an error when incrementing fails', async () => {
      (incrementUICounter as jest.Mock).mockImplementation(jest.fn(() => Promise.reject('Failed')));

      await mockRouter.callRoute({ body: { action: 'error', metric: 'error' } });

      expect(incrementUICounter).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRouter.response.internalError).toHaveBeenCalled();
    });

    it('throws an error if the Saved Objects service is unavailable', async () => {
      jest.clearAllMocks();
      registerTelemetryRoute({
        router: mockRouter.router,
        getSavedObjectsService: null,
        log: mockLogger,
      } as any);
      await mockRouter.callRoute({});

      expect(incrementUICounter).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockRouter.response.internalError).toHaveBeenCalled();
      expect(loggingSystemMock.collect(mockLogger).error[0][0]).toEqual(
        expect.stringContaining(
          'App Search UI telemetry error: Error: Could not find Saved Objects service'
        )
      );
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

      it('wrong metric type', () => {
        const request = { body: { action: 'clicked', metric: true } };
        mockRouter.shouldThrow(request);
      });

      it('action is missing', () => {
        const request = { body: { metric: 'engines_overview' } };
        mockRouter.shouldThrow(request);
      });

      it('metric is missing', () => {
        const request = { body: { action: 'error' } };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
