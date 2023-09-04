/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockRouter, mockDependencies } from '../../__mocks__';

import { RequestHandlerContext } from '@kbn/core/server';
import { SavedObjectsServiceStart } from '@kbn/core-saved-objects-server';
import { DataPluginStart } from '@kbn/data-plugin/server/plugin';

jest.mock('../../lib/analytics/fetch_analytics_collection', () => ({
  fetchAnalyticsCollections: jest.fn(),
}));

import { AnalyticsCollection } from '../../../common/types/analytics';
import { ErrorCode } from '../../../common/types/error_codes';
import { fetchAnalyticsCollections } from '../../lib/analytics/fetch_analytics_collection';

import { registerAnalyticsRoutes } from './analytics';

describe('Enterprise Search Analytics API', () => {
  let mockRouter: MockRouter;
  const mockClient = {};

  describe('GET /internal/enterprise_search/analytics/collections', () => {
    beforeEach(() => {
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/analytics/collections',
      });

      const mockDataPlugin = {
        indexPatterns: {
          dataViewsServiceFactory: jest.fn(),
        },
      };

      const mockedSavedObjects = {
        getScopedClient: jest.fn(),
      };

      registerAnalyticsRoutes({
        ...mockDependencies,
        data: mockDataPlugin as unknown as DataPluginStart,
        savedObjects: mockedSavedObjects as unknown as SavedObjectsServiceStart,
        router: mockRouter.router,
      });
    });

    it('fetches a defined analytics collections', async () => {
      const mockData: AnalyticsCollection[] = [
        {
          events_datastream: 'logs-elastic_analytics.events-example',
          name: 'my_collection',
        },
        {
          events_datastream: 'logs-elastic_analytics.events-example2',
          name: 'my_collection2',
        },
        {
          events_datastream: 'logs-elastic_analytics.events-example2',
          name: 'my_collection3',
        },
      ];

      (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });
      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
      });
    });

    it('passes the query string to the fetch function', async () => {
      await mockRouter.callRoute({ query: { query: 'my_collection2' } });

      expect(fetchAnalyticsCollections).toHaveBeenCalledWith(mockClient, 'my_collection2*');
    });

    it('returns an empty obj when fetchAnalyticsCollections returns not found error', async () => {
      (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() => {
        throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
      });
      await mockRouter.callRoute({});

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: [],
      });
    });
  });

  describe('GET /internal/enterprise_search/analytics/collections/{id}', () => {
    beforeEach(() => {
      const context = {
        core: Promise.resolve({ elasticsearch: { client: mockClient } }),
      } as jest.Mocked<RequestHandlerContext>;

      mockRouter = new MockRouter({
        context,
        method: 'get',
        path: '/internal/enterprise_search/analytics/collections/{name}',
      });

      const mockDataPlugin = {
        indexPatterns: {
          dataViewsServiceFactory: jest.fn(),
        },
      };

      const mockedSavedObjects = {
        getScopedClient: jest.fn(),
      };

      registerAnalyticsRoutes({
        ...mockDependencies,
        data: mockDataPlugin as unknown as DataPluginStart,
        savedObjects: mockedSavedObjects as unknown as SavedObjectsServiceStart,
        router: mockRouter.router,
      });
    });

    it('fetches a defined analytics collection name', async () => {
      const mockData: AnalyticsCollection[] = [
        {
          events_datastream: 'logs-elastic_analytics.events-example',
          name: 'my_collection',
        },
      ];

      (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });
      await mockRouter.callRoute({ params: { name: '1' } });

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData[0],
      });
    });

    it('throws a 404 error if data returns an empty obj', async () => {
      (fetchAnalyticsCollections as jest.Mock).mockImplementationOnce(() => {
        throw new Error(ErrorCode.ANALYTICS_COLLECTION_NOT_FOUND);
      });
      await mockRouter.callRoute({
        params: { name: 'my_collection' },
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
