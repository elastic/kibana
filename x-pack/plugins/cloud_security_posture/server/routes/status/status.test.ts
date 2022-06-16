/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspAppService } from '../../lib/csp_app_services';
import { CspAppContext } from '../../plugin';
import { defineGetCspSetupStatusRoute } from './status';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import { ESSearchResponse } from '@kbn/core/types/elasticsearch';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import {
  createMockAgentPolicyService,
  createMockAgentService,
  createMockPackageService,
  createPackagePolicyServiceMock,
  xpackMocks,
} from '@kbn/fleet-plugin/server/mocks';

import {
  AgentClient,
  AgentPolicyServiceInterface,
  AgentService,
  PackageClient,
  PackagePolicyServiceInterface,
  PackageService,
} from '@kbn/fleet-plugin/server';

describe('CspSetupStatus route', () => {
  const logger: ReturnType<typeof loggingSystemMock.createLogger> =
    loggingSystemMock.createLogger();
  let mockContext: ReturnType<typeof xpackMocks.createRequestHandlerContext>;
  let mockPackagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;
  let mockAgentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockAgentClient: jest.Mocked<AgentClient>;
  let mockPackageService: PackageService;
  let mockPackageClient: jest.Mocked<PackageClient>;
  let cspContext: CspAppContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockContext = xpackMocks.createRequestHandlerContext();
    mockPackagePolicyService = createPackagePolicyServiceMock();
    mockAgentPolicyService = createMockAgentPolicyService();
    mockAgentService = createMockAgentService();
    mockAgentClient = mockAgentService.asInternalUser as jest.Mocked<AgentClient>;

    mockPackageService = createMockPackageService();
    mockPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;
    // mockGetAgentStatusForAgentPolicy = mockAgentService.getFullAgentPolicy as jest.Mock;

    // @ts-expect-error
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce({
      name: 'cis_kubernetes_benchmark',
      version: '0.14',
    });

    cspContext = {
      logger,
      // @ts-expect-error 2322
      service: {
        agentService: mockAgentService,
        agentPolicyService: mockAgentPolicyService,
        packagePolicyService: mockPackagePolicyService,
        packageService: mockPackageService,
      },
      security: securityMock.createSetup(),
    };
  });

  it('validate the API route path', async () => {
    const router = httpServiceMock.createRouter();

    defineGetCspSetupStatusRoute(router, cspContext);

    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/status');
  });

  it('Verify the API result when there are findings', async () => {
    const router = httpServiceMock.createRouter();

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 1,
      page: 1,
      perPage: 100,
    });

    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    (await mockContext.core).elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{}],
      },
    } as unknown as ESSearchResponse);

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({ status: 'indexed' });
  });

  it('Verify the API result when there are no findings and no installed packages', async () => {
    const router = httpServiceMock.createRouter();

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
    });

    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    (await mockContext.core).elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {},
    } as unknown as ESSearchResponse);

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({ status: 'not installed' });
  });

  it('Verify the API result when there are no findings and no deployed agent', async () => {
    const router = httpServiceMock.createRouter();

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 1,
      page: 1,
      perPage: 100,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      {
        id: 'f35e45f0-ed6e-11ec-a701-5bbe8f25448a',
        version: 'WzQ3OTEsMV0=',
        name: 'agent1',
        description: '',
        namespace: 'default',
        monitoring_enabled: [],
        status: 'active',
        is_managed: false,
        revision: 3,
        updated_at: '2022-06-16T12:22:50.938Z',
        updated_by: 'elastic',
        package_policies: [{}],
      },
    ]);
    mockAgentClient.getAgentStatusForAgentPolicy.mockResolvedValueOnce({ total: 0 });
    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    (await mockContext.core).elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {},
    } as unknown as ESSearchResponse);

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({ status: 'not deployed' });
  });
});
