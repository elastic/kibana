/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerCredentialsRoutes } from './credentials';

describe('credentials routes', () => {
  describe('GET /api/app_search/credentials', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({ method: 'get', payload: 'query' });

      registerCredentialsRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request handler', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/credentials/collection',
        hasValidData: expect.any(Function),
      });
    });

    describe('hasValidData', () => {
      it('should correctly validate that a response has data', () => {
        const response = {
          meta: {
            page: {
              current: 1,
              total_pages: 1,
              total_results: 1,
              size: 25,
            },
          },
          results: [
            {
              id: 'loco_moco_account_id:5f3575de2b76ff13405f3155|name:asdfasdf',
              key: 'search-fe49u2z8d5gvf9s4ekda2ad4',
              name: 'asdfasdf',
              type: 'search',
              access_all_engines: true,
            },
          ],
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

    describe('validates', () => {
      it('correctly', () => {
        const request = { query: { 'page[current]': 1 } };
        mockRouter.shouldValidate(request);
      });

      it('missing page[current]', () => {
        const request = { query: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
