/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { defineGetCspSetupStatusRoute } from './setup_status';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';
import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { securityMock } from '@kbn/security-plugin/server/mocks';

describe('CspSetupStatus route', () => {
  const logger: ReturnType<typeof loggingSystemMock.createLogger> =
    loggingSystemMock.createLogger();
  const mockResponse = httpServerMock.createResponseFactory();
  const mockRequest = httpServerMock.createKibanaRequest();
  const mockEsClient = elasticsearchClientMock.createElasticsearchClient();
  const mockContext = {
    core: {
      elasticsearch: { client: { asCurrentUser: mockEsClient } },
    },
  };
  const router = httpServiceMock.createRouter();
  const cspAppContextService = new CspAppService();

  const cspContext: CspAppContext = {
    logger,
    service: cspAppContextService,
    security: securityMock.createSetup(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validate the API route path', async () => {
    defineGetCspSetupStatusRoute(router, cspContext);
    const [config] = router.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/setup_status');
  });

  it('validate the API result when there are no findings in latest findings index', async () => {
    defineGetCspSetupStatusRoute(router, cspContext);
    mockEsClient.search.mockResponse({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);

    const [_, handler] = router.get.mock.calls[0];

    await handler(mockContext, mockRequest, mockResponse);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    await expect(body).toEqual({ latestFindingsIndexStatus: 'inapplicable' });
  });

  it('validate the API result when there are findings in latest findings index', async () => {
    defineGetCspSetupStatusRoute(router, cspContext);
    mockEsClient.search.mockResponse({
      hits: {
        hits: [{}],
      },
    } as unknown as ESSearchResponse);

    const [_, handler] = router.get.mock.calls[0];

    await handler(mockContext, mockRequest, mockResponse);
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);
    await expect(body).toEqual({ latestFindingsIndexStatus: 'applicable' });
  });
});
