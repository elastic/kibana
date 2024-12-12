/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { registerGetInsightsRoute } from './get_insights';
import { WORKFLOW_INSIGHTS_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../../services', () => ({
  securityWorkflowInsightsService: {
    fetch: jest.fn(),
  },
}));

const fetchMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .fetch as jest.Mock;

describe('Get Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let callRoute: (params: Record<string, string>, authz?: Record<string, boolean>) => Promise<void>;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();

    const mockEndpointContext = createMockEndpointAppContext();
    const router = httpServiceMock.createRouter();

    registerGetInsightsRoute(router, mockEndpointContext);

    callRoute = async (params, authz = { canReadSecuritySolution: true }) => {
      const mockContext = {
        core: {
          security: {
            authc: {
              getCurrentUser: jest
                .fn()
                .mockReturnValue({ username: 'test-user', roles: ['admin'] }),
            },
          },
        },
        securitySolution: {
          getEndpointAuthz: jest.fn().mockResolvedValue(authz),
        },
      };

      const request = httpServerMock.createKibanaRequest({
        method: 'get',
        path: WORKFLOW_INSIGHTS_ROUTE,
        query: params,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'get',
        WORKFLOW_INSIGHTS_ROUTE,
        '1'
      )!;
      await routeHandler(mockContext, request, mockResponse);
    };
  });

  describe('with valid privileges', () => {
    it('should fetch insights and return them', async () => {
      const mockInsights = [
        { _source: { id: 1, name: 'Insight 1' } },
        { _source: { id: 2, name: 'Insight 2' } },
      ];
      fetchMock.mockResolvedValue(mockInsights);

      await callRoute({ query: 'test-query' });

      expect(fetchMock).toHaveBeenCalledWith({ query: 'test-query' });
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: [
          { id: 1, name: 'Insight 1' },
          { id: 2, name: 'Insight 2' },
        ],
      });
    });

    it('should handle missing query parameters', async () => {
      fetchMock.mockResolvedValue([]);

      await callRoute({});

      expect(fetchMock).toHaveBeenCalledWith({});
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: [],
      });
    });
  });

  describe('with invalid privileges', () => {
    it('should return forbidden if user lacks read privileges', async () => {
      await callRoute({}, { canReadSecuritySolution: false });

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
