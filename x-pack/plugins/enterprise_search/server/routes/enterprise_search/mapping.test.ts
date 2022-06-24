/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

jest.mock('../../lib/fetch_mapping', () => ({
  fetchMapping: jest.fn(),
}));
import { fetchMapping } from '../../lib/fetch_mapping';

import { registerMappingRoute } from './mapping';

describe('Elasticsearch Index Mapping', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/enterprise_search/{index_name}/mapping',
    });

    registerMappingRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('GET /internal/enterprise_search/{index_name}/mapping', () => {
    it('fails validation without index_name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });

    it('returns the mapping for an Elasticsearch index', async () => {
      const mockData = {
        mappings: {
          dynamic: true,
          dynamic_templates: [],
          properties: {},
        },
      };

      (fetchMapping as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });

      // TODO: need to mock const { client } = (await context.core).elasticsearch;

      await mockRouter.callRoute({
        params: { indexName: 'search-index-name' }
      });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
