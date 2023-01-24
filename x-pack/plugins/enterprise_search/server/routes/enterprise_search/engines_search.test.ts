/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, mockRequestHandler, MockRouter } from '../../__mocks__';

import { registerEnginesSearchRoutes } from './engines_search';

describe('engines search routes', () => {

  describe('GET /internal/enterprise_search/engines/{engine_name}/search', () => {
    let mockRouter: MockRouter;

    beforeEach(() => {
      jest.clearAllMocks();
      mockRouter = new MockRouter({
        method: 'get',
        path: '/internal/enterprise_search/engines/{engine_name}/search',
      });

      registerEnginesSearchRoutes({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/api/engines/:engine_name/_search',
      });
    });

    it('validates correctly', () => {
      const request = {
        params: {
          engine_name: 'some-engine',
          from: 0,
          size: 10,
        },
        body: {
          query: {
            match_all: {}
          }
        }
      };

      mockRouter.shouldValidate(request);
    });

    it('validates correctly with default pagination', () => {
      const request = {
        params: {
          engine_name: 'some-engine'
        },
      };

      mockRouter.shouldValidate(request);
    });

    it('fails validation without engine', () => {
      const request = { params: {} };

      mockRouter.shouldThrow(request);
    });
  });
});
