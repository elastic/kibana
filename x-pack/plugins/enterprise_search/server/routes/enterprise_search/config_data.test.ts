/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INITIAL_APP_DATA } from '../../../common/__mocks__';
import { MockRouter, mockDependencies } from '../../__mocks__';

jest.mock('../../lib/enterprise_search_config_api', () => ({
  callEnterpriseSearchConfigAPI: jest.fn(),
}));
import { callEnterpriseSearchConfigAPI } from '../../lib/enterprise_search_config_api';

import { registerConfigDataRoute } from './config_data';

describe('Enterprise Search Config Data API', () => {
  let mockRouter: MockRouter;

  beforeEach(() => {
    mockRouter = new MockRouter({ method: 'get' });

    registerConfigDataRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('GET /api/enterprise_search/config_data', () => {
    it('returns an initial set of config data from Enterprise Search', async () => {
      const mockData = {
        access: {
          hasAppSearchAccess: true,
          hasWorkplaceSearchAccess: true,
        },
        publicUrl: 'http://localhost:3002',
        ...DEFAULT_INITIAL_APP_DATA,
      };

      (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });
      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });

    it('throws a 502 error if data returns an empty obj', async () => {
      (callEnterpriseSearchConfigAPI as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve({});
      });
      await mockRouter.callRoute({});

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: 'Error fetching data from Enterprise Search',
      });
    });
  });
});
