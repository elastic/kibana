/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerWSOverviewRoute } from './overview';

describe('Overview route', () => {
  describe('GET /api/workplace_search/overview', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerWSOverviewRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/ws/org',
        hasValidData: expect.any(Function),
      });
    });

    describe('hasValidData', () => {
      it('should correctly validate that the response has data', () => {
        const response = {
          accountsCount: 1,
        };

        expect(mockRequestHandler.hasValidData(response)).toBe(true);
      });

      it('should correctly validate that a response does not have data', () => {
        const response = {
          foo: 'bar',
        };

        expect(mockRequestHandler.hasValidData(response)).toBe(false);
      });
    });
  });
});
