/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MockRouter } from '../__mocks__/router.mock';

jest.mock('../../lib/enterprise_search_config_api', () => ({
  callEnterpriseSearchConfigAPI: jest.fn(),
}));
import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';

import { registerPublicUrlRoute } from './public_url';

describe('Enterprise Search Public URL API', () => {
  const mockRouter = new MockRouter({ method: 'get' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.createRouter();

    registerPublicUrlRoute({
      router: mockRouter.router,
      config: {},
      log: {},
    } as any);
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
