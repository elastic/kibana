/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { loggingSystemMock, savedObjectsServiceMock } from 'src/core/server/mocks';
import { MockRouter, mockLogger, mockDependencies } from '../../__mocks__';

jest.mock('../../collectors/lib/telemetry', () => ({
  incrementUICounter: jest.fn(),
}));
import { incrementUICounter } from '../../collectors/lib/telemetry';

import { registerTelemetryRoute } from './telemetry';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the collector functions correctly. Business logic
 * is tested more thoroughly in the collectors/telemetry tests.
 */
describe('Enterprise Search Telemetry API', () => {
  let mockRouter: MockRouter;
  const successResponse = { success: true };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = new MockRouter({ method: 'put', payload: 'body' });

    registerTelemetryRoute({
      ...mockDependencies,
      router: mockRouter.router,
      getSavedObjectsService: () => savedObjectsServiceMock.createStartContract(),
      log: mockLogger,
    });
  });

  describe('PUT /api/enterprise_search/telemetry', () => {
    it('increments the saved objects counter for App Search', async () => {
      (incrementUICounter as jest.Mock).mockImplementation(jest.fn(() => successResponse));

      await mockRouter.callRoute({
        body: {
          product: 'app_search',
          action: 'viewed',
          metric: 'setup_guide',
        },
      });

      expect(incrementUICounter).toHaveBeenCalledWith({
        id: 'app_search_telemetry',
        savedObjects: expect.any(Object),
        uiAction: 'ui_viewed',
        metric: 'setup_guide',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: successResponse });
    });

    it('increments the saved objects counter for Workplace Search', async () => {
      (incrementUICounter as jest.Mock).mockImplementation(jest.fn(() => successResponse));

      await mockRouter.callRoute({
        body: {
          product: 'workplace_search',
          action: 'clicked',
          metric: 'onboarding_card_button',
        },
      });

      expect(incrementUICounter).toHaveBeenCalledWith({
        id: 'workplace_search_telemetry',
        savedObjects: expect.any(Object),
        uiAction: 'ui_clicked',
        metric: 'onboarding_card_button',
      });
      expect(mockRouter.response.ok).toHaveBeenCalledWith({ body: successResponse });
    });

    it('throws an error when incrementing fails', async () => {
      (incrementUICounter as jest.Mock).mockImplementation(jest.fn(() => Promise.reject('Failed')));

      await mockRouter.callRoute({
        body: {
          product: 'enterprise_search',
          action: 'error',
          metric: 'error',
        },
      });

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
          'Enterprise Search UI telemetry error: Error: Could not find Saved Objects service'
        )
      );
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: { product: 'workplace_search', action: 'viewed', metric: 'setup_guide' },
        };
        mockRouter.shouldValidate(request);
      });

      it('wrong product string', () => {
        const request = {
          body: { product: 'workspace_space_search', action: 'viewed', metric: 'setup_guide' },
        };
        mockRouter.shouldThrow(request);
      });

      it('wrong action string', () => {
        const request = {
          body: { product: 'app_search', action: 'invalid', metric: 'setup_guide' },
        };
        mockRouter.shouldThrow(request);
      });

      it('wrong metric type', () => {
        const request = { body: { product: 'enterprise_search', action: 'clicked', metric: true } };
        mockRouter.shouldThrow(request);
      });

      it('product is missing string', () => {
        const request = { body: { action: 'viewed', metric: 'setup_guide' } };
        mockRouter.shouldThrow(request);
      });

      it('action is missing', () => {
        const request = { body: { product: 'app_search', metric: 'engines_overview' } };
        mockRouter.shouldThrow(request);
      });

      it('metric is missing', () => {
        const request = { body: { product: 'app_search', action: 'error' } };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
