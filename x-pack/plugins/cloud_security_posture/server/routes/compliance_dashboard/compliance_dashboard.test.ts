/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import // eslint-disable-next-line @kbn/eslint/no-restricted-paths
'@kbn/core/server/elasticsearch/client/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from '@kbn/core/server/http/router/request';
import { defineGetComplianceDashboardRoute } from './compliance_dashboard';

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';

describe('compliance dashboard permissions API', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.clearAllMocks();
  });

  it('should accept to a user with fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineGetComplianceDashboardRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });

  it('should reject to a user without fleet.all privilege', async () => {
    const router = httpServiceMock.createRouter();
    const cspAppContextService = new CspAppService();

    const cspContext: CspAppContext = {
      logger,
      service: cspAppContextService,
    };
    defineGetComplianceDashboardRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });
});
