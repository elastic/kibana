/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { INTERNAL_DASHBOARDS_URL } from '../../../../common/constants';
import {
  serverMock,
  requestContextMock,
  mockGetCurrentUser,
  requestMock,
} from '../../detection_engine/routes/__mocks__';
import { getSecuritySolutionDashboards } from '../helpers';
import { mockGetDashboardsResult } from '../__mocks__';
import { getSecuritySolutionDashboardsRoute } from './get_security_solution_dashboards';
jest.mock('../helpers', () => ({ getSecuritySolutionDashboards: jest.fn() }));

describe('getSecuritySolutionDashboardsRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let securitySetup: SecurityPluginSetup;
  const { context } = requestContextMock.createTools();
  const logger = { error: jest.fn() } as unknown as Logger;
  const mockRequest = requestMock.create({
    method: 'get',
    path: INTERNAL_DASHBOARDS_URL,
  });
  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();

    securitySetup = {
      authc: {
        getCurrentUser: jest.fn().mockReturnValue(mockGetCurrentUser),
      },
      authz: {},
    } as unknown as SecurityPluginSetup;

    getSecuritySolutionDashboardsRoute(server.router, logger, securitySetup);
  });

  it('should return dashboards with Security Solution tags', async () => {
    (getSecuritySolutionDashboards as jest.Mock).mockResolvedValue({
      response: mockGetDashboardsResult,
    });

    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(200);
    expect(response.body).toEqual(mockGetDashboardsResult);
  });

  it('should return error', async () => {
    const error = {
      statusCode: 500,
      message: 'Internal Server Error',
    };
    (getSecuritySolutionDashboards as jest.Mock).mockResolvedValue({
      response: null,
      error,
    });

    const response = await server.inject(mockRequest, requestContextMock.convertContext(context));

    expect(response.status).toEqual(error.statusCode);
    expect(response.body.message).toEqual(`Failed to get dashboards - ${error.message}`);
  });
});
