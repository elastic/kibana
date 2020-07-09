/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter, mockDependencies } from '../__mocks__';

jest.mock('../../lib/enterprise_search_config_api', () => ({
  callEnterpriseSearchConfigAPI: jest.fn(),
}));
import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';

import { registerPublicUrlRoute } from './public_url';

describe('Enterprise Search Public URL API', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    mockRouter = new MockRouter({ method: 'get' });

    registerPublicUrlRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('GET /api/enterprise_search/public_url', () => {
    it('returns a publicUrl', async () => {
      (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({ publicUrl: 'http://some.vanity.url' });
      });

      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { publicUrl: 'http://some.vanity.url' },
        headers: { 'content-type': 'application/json' },
      });
    });

    // For the most part, all error logging is handled by callEnterpriseSearchConfigAPI.
    // This endpoint should mostly just fall back gracefully to an empty string
    it('falls back to an empty string', async () => {
      await mockRouter.callRoute({});
      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: { publicUrl: '' },
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
