/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard';
import { createCspRequestHandlerContextMock } from '../../mocks';

describe('compliance dashboard permissions API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineGetComplianceDashboardRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = createCspRequestHandlerContextMock();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();

    defineGetComplianceDashboardRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = createCspRequestHandlerContextMock();
    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });
});
