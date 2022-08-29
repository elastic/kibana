/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';

jest.mock('../../lib/analytics/fetch_analytics_collection', () => ({
  fetchAnalyticsCollectionByName: jest.fn(),
}));
import { AnalyticsCollection } from '../../../common/types/analytics';
import { fetchAnalyticsCollectionByName } from '../../lib/analytics/fetch_analytics_collection';

import { registerAnalyticsRoutes } from './analytics';

describe('Enterprise Search Analytics API', () => {
  let mockRouter: MockRouter;
  const mockClient = {};

  beforeEach(() => {
    const context = {
      core: Promise.resolve({ elasticsearch: { client: mockClient } }),
    } as jest.Mocked<RequestHandlerContext>;

    mockRouter = new MockRouter({
      context,
      method: 'get',
      path: '/internal/enterprise_search/analytics/collections/{collection_name}',
    });

    registerAnalyticsRoutes({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });

  describe('GET /internal/enterprise_search/analytics/collections/{collection_name}', () => {
    it('fetches a defined analytics collection name', async () => {
      const mockData: AnalyticsCollection = {
        event_retention_day_length: 30,
        id: '1',
        name: 'my_collection',
      };

      (fetchAnalyticsCollectionByName as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });
      await mockRouter.callRoute({ params: { collection_name: 'my_collection' } });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
      });
    });

    it('throws a 404 error if data returns an empty obj', async () => {
      (fetchAnalyticsCollectionByName as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(undefined);
      });
      await mockRouter.callRoute({
        params: { collection_name: 'my_collection' },
      });

      expect(mockRouter.response.customError).toHaveBeenCalledWith({
        body: {
          attributes: {
            error_code: 'analytics_collection_not_found',
          },
          message: 'Analytics collection not found',
        },
        statusCode: 404,
      });
    });
  });
});
