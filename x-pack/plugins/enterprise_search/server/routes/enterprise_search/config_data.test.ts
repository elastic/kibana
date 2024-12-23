/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { MockRouter, mockDependencies } from '../../__mocks__';

import { registerConfigDataRoute } from './config_data';

describe('Enterprise Search Config Data API', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    mockRouter = new MockRouter({
      method: 'get',
      path: '/internal/enterprise_search/config_data',
    });

    registerConfigDataRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('GET /internal/enterprise_search/config_data', () => {
    it('returns an initial set of config data from Enterprise Search', async () => {
      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: DEFAULT_INITIAL_APP_DATA,
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
