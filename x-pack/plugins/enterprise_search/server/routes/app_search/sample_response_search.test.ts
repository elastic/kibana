/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockRequestHandler, mockDependencies } from '../../__mocks__';

import { registerSampleResponseSearchRoute } from './sample_response_search';

const resultFields = {
  id: {
    raw: {},
  },
  hp: {
    raw: {},
  },
  name: {
    raw: {},
  },
};

describe('sample response search route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/app_search/engines/{name}/sample_response_search', () => {
    const mockRouter = new MockRouter({
      method: 'post',
      path: '/api/app_search/engines/{engineName}/sample_response_search',
    });

    beforeEach(() => {
      registerSampleResponseSearchRoute({
        ...mockDependencies,
        router: mockRouter.router,
      });
    });

    it('creates a request to enterprise search', () => {
      mockRouter.callRoute({
        params: { engineName: 'some-engine' },
        body: {
          query: 'test',
          result_fields: resultFields,
        },
      });

      expect(mockRequestHandler.createRequest).toHaveBeenCalledWith({
        path: '/as/engines/:engineName/sample_response_search',
      });
    });

    describe('validates', () => {
      it('correctly', () => {
        const request = {
          body: {
            query: 'test',
            result_fields: resultFields,
          },
        };
        mockRouter.shouldValidate(request);
      });
      it('missing required fields', () => {
        const request = { body: {} };
        mockRouter.shouldThrow(request);
      });
    });
  });
});
