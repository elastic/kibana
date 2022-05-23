/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/logging/logging_system.mock';
import { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import { Chance } from 'chance';
import { httpServiceMock } from '@kbn/core/server/http/http_service.mock';
import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { defineGetInfoRoute } from './info';
import { httpServerMock } from '@kbn/core/server/http/http_server.mocks';

describe('Update rules configuration API', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  const chance = new Chance();

  const router = httpServiceMock.createRouter();
  const cspAppContextService = new CspAppService();

  const cspContext: CspAppContext = {
    logger,
    service: cspAppContextService,
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    defineGetInfoRoute(router, cspContext);
    const [config] = router.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/info');
  });

  it('should accept to a user with fleet.all privilege', async () => {
    defineGetInfoRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockContext = {
      fleet: { authz: { fleet: { all: true } } },
    } as unknown as KibanaRequest;

    const mockRequest = httpServerMock.createKibanaRequest();
    const mockResponse = httpServerMock.createResponseFactory();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledTimes(0);
  });
});
