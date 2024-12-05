/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { registerUpdateInsightsRoute } from './update_insight';
import { createMockEndpointAppContext, getRegisteredVersionedRouteMock } from '../../mocks';
import { WORKFLOW_INSIGHTS_UPDATE_ROUTE } from '../../../../common/endpoint/constants';

jest.mock('../../services', () => ({
  securityWorkflowInsightsService: {
    update: jest.fn(),
  },
}));

const updateMock = jest.requireMock('../../services').securityWorkflowInsightsService
  .update as jest.Mock;

describe('Update Insights Route Handler', () => {
  let mockResponse: ReturnType<typeof httpServerMock.createResponseFactory>;
  let callRoute: (
    params: Record<string, string>,
    body: Record<string, string>,
    authz?: Record<string, boolean>
  ) => Promise<void>;

  beforeEach(() => {
    mockResponse = httpServerMock.createResponseFactory();

    const mockEndpointContext = createMockEndpointAppContext();
    const router = httpServiceMock.createRouter();

    registerUpdateInsightsRoute(router, mockEndpointContext);

    callRoute = async (params, body, authz = { canReadSecuritySolution: true }) => {
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
        method: 'put',
        path: WORKFLOW_INSIGHTS_UPDATE_ROUTE,
        params,
        body,
      });

      const { routeHandler } = getRegisteredVersionedRouteMock(
        router,
        'put',
        WORKFLOW_INSIGHTS_UPDATE_ROUTE,
        '1'
      )!;
      await routeHandler(mockContext, request, mockResponse);
    };
  });

  describe('with valid privileges', () => {
    it('should update insight and return the updated data', async () => {
      const mockUpdatedInsight = { id: 1, name: 'Updated Insight', type: 'incompatible_antivirus' };
      updateMock.mockResolvedValue(mockUpdatedInsight);

      const updateBody = { name: 'Updated Insight' };

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', updateBody);
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: mockUpdatedInsight,
      });
    });

    it('should handle missing body parameters', async () => {
      updateMock.mockResolvedValue({ id: 1, name: 'Insight 1' });

      const updateBody = {}; // Empty body to test missing parameters

      await callRoute({ insightId: '1' }, updateBody);

      expect(updateMock).toHaveBeenCalledWith('1', {});
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { id: 1, name: 'Insight 1' },
      });
    });
  });

  describe('with invalid privileges', () => {
    it('should return forbidden if user lacks read privileges', async () => {
      await callRoute(
        { insightId: '1' },
        { name: 'Updated Insight' },
        { canReadSecuritySolution: false }
      );

      expect(mockResponse.forbidden).toHaveBeenCalled();
    });
  });
});
