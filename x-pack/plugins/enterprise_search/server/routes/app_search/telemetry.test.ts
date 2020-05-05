/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockRouter, RouterMock } from 'src/core/server/http/router/router.mock';
import { savedObjectsServiceMock } from 'src/core/server/saved_objects/saved_objects_service.mock';
import { loggingServiceMock } from 'src/core/server/mocks';
import { httpServerMock } from 'src/core/server/http/http_server.mocks';

import { registerTelemetryRoute } from './telemetry';

jest.mock('../../collectors/app_search/telemetry', () => ({
  incrementUICounter: jest.fn(),
}));
import { incrementUICounter } from '../../collectors/app_search/telemetry';

describe('App Search Telemetry API', () => {
  let router: RouterMock;
  const mockResponse = httpServerMock.createResponseFactory();
  const mockLogger = loggingServiceMock.create().get();

  beforeEach(() => {
    jest.resetAllMocks();
    router = mockRouter.create();
    registerTelemetryRoute({
      router,
      getSavedObjectsService: () => savedObjectsServiceMock.create(),
      log: mockLogger,
    });
  });

  describe('PUT /api/app_search/telemetry', () => {
    it('increments the saved objects counter', async () => {
      const successResponse = { success: true };
      incrementUICounter.mockImplementation(jest.fn(() => successResponse));

      await callThisRoute('put', { body: { action: 'viewed', metric: 'setup_guide' } });

      expect(incrementUICounter).toHaveBeenCalledWith({
        savedObjects: expect.any(Object),
        uiAction: 'ui_viewed',
        metric: 'setup_guide',
      });
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: successResponse });
    });

    it('throws an error when incrementing fails', async () => {
      incrementUICounter.mockImplementation(jest.fn(() => Promise.reject('Failed')));

      await callThisRoute('put', { body: { action: 'error', metric: 'error' } });

      expect(incrementUICounter).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockResponse.internalError).toHaveBeenCalled();
    });

    describe('validates', () => {
      const itShouldValidate = request => {
        expect(() => executeRouteValidation(request)).not.toThrow();
      };

      const itShouldThrow = request => {
        expect(() => executeRouteValidation(request)).toThrow();
      };

      it('correctly', () => {
        const request = { body: { action: 'viewed', metric: 'setup_guide' } };
        itShouldValidate(request);
      });

      it('wrong action enum', () => {
        const request = { body: { action: 'invalid', metric: 'setup_guide' } };
        itShouldThrow(request);
      });

      describe('wrong metric type', () => {
        const request = { body: { action: 'clicked', metric: true } };
        itShouldThrow(request);
      });

      describe('action is missing', () => {
        const request = { body: { metric: 'engines_overview' } };
        itShouldThrow(request);
      });

      describe('metric is missing', () => {
        const request = { body: { action: 'error' } };
        itShouldThrow(request);
      });
    });
  });

  /**
   * Test helpers
   */

  const callThisRoute = async (method, request) => {
    const [_, handler] = router[method].mock.calls[0];

    const context = {};
    await handler(context, httpServerMock.createKibanaRequest(request), mockResponse);
  };

  const executeRouteValidation = request => {
    const method = 'put';

    const [config] = router[method].mock.calls[0];
    const validate = config.validate as RouteValidatorConfig<{}, {}, {}>;

    const payload = 'body';
    validate[payload].validate(request[payload]);
  };
});
