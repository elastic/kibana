/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CspAppContext } from '../../plugin';
import { defineGetCspSetupStatusRoute, INDEX_TIMEOUT_IN_MINUTES } from './status';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { ESSearchResponse } from '@kbn/core/types/elasticsearch';
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
import {
  AgentPolicy,
  GetAgentStatusResponse,
  Installation,
  RegistryPackage,
} from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

const mockCspPackageInfo: Installation = {
  verification_status: 'verified',
  installed_kibana: [],
  installed_kibana_space_id: 'default',
  installed_es: [],
  package_assets: [],
  es_index_patterns: { findings: 'logs-cloud_security_posture.findings-*' },
  name: 'cloud_security_posture',
  version: '0.0.14',
  install_version: '0.0.14',
  install_status: 'installed',
  install_started_at: '2022-06-16T15:24:58.281Z',
  install_source: 'registry',
};

const mockLatestCspPackageInfo: RegistryPackage = {
  format_version: 'mock',
  name: 'cloud_security_posture',
  title: 'CIS Kubernetes Benchmark',
  version: '0.0.14',
  release: 'experimental',
  description: 'Check Kubernetes cluster compliance with the Kubernetes CIS benchmark.',
  type: 'integration',
  download: '/epr/cloud_security_posture/cloud_security_posture-0.0.14.zip',
  path: '/package/cloud_security_posture/0.0.14',
  policy_templates: [],
  owner: { github: 'elastic/cloud-security-posture' },
  categories: ['containers', 'kubernetes'],
};

describe('CspSetupStatus route', () => {
  const router = httpServiceMock.createRouter();
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
    mockPackageService = createMockPackageService();

    mockAgentClient = mockAgentService.asInternalUser as jest.Mocked<AgentClient>;
    mockPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;

    cspContext = {
      logger,
      service: {
        agentService: mockAgentService,
        agentPolicyService: mockAgentPolicyService,
        packagePolicyService: mockPackagePolicyService,
        packageService: mockPackageService,
      },
      security: securityMock.createSetup(),
    } as unknown as CspAppContext;
  });

  it('validate the API route path', async () => {
    defineGetCspSetupStatusRoute(router, cspContext);
    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/status');
  });

  it('Verify the API result when there are findings and no installed policies', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Findings: 'foo' }],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
    });

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;
    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toEqual({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 0,
      healthyAgents: 0,
      installedPackageVersion: undefined,
    });
  });

  it('Verify the API result when there are findings, installed policies, no running agents', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Findings: 'foo' }],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 3,
      page: 1,
      perPage: 100,
    });

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toEqual({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 3,
      healthyAgents: 0,
      installedPackageVersion: '0.0.14',
    });
  });

  it('Verify the API result when there are findings, installed policies, running agents', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Findings: 'foo' }],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 3,
      page: 1,
      perPage: 100,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      { package_policies: createPackagePolicyMock() },
    ] as unknown as AgentPolicy[]);

    mockAgentClient.getAgentStatusForAgentPolicy.mockResolvedValue({
      total: 1,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toEqual({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 3,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
    });
  });

  it('Verify the API result when there are no findings and no installed policies', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
    });

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'not-installed',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 0,
      healthyAgents: 0,
    });
  });

  it('Verify the API result when there are no findings, installed agent but no deployed agent', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 1,
      page: 1,
      perPage: 100,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      { package_policies: createPackagePolicyMock() },
    ] as unknown as AgentPolicy[]);

    mockAgentClient.getAgentStatusForAgentPolicy.mockResolvedValue({
      total: 0,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'not-deployed',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 1,
      healthyAgents: 0,
      installedPackageVersion: '0.0.14',
    });
  });

  it('Verify the API result when there are no findings, installed agent, deployed agent, before index timeout', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);

    const currentTime = new Date();
    mockCspPackageInfo.install_started_at = new Date(
      currentTime.setMinutes(currentTime.getMinutes() - INDEX_TIMEOUT_IN_MINUTES + 1)
    ).toUTCString();

    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 1,
      page: 1,
      perPage: 100,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      { package_policies: createPackagePolicyMock() },
    ] as unknown as AgentPolicy[]);

    mockAgentClient.getAgentStatusForAgentPolicy.mockResolvedValue({
      total: 1,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'indexing',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 1,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
    });
  });

  it('Verify the API result when there are no findings, installed agent, deployed agent, after index timeout', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);

    const currentTime = new Date();
    mockCspPackageInfo.install_started_at = new Date(
      currentTime.setMinutes(currentTime.getMinutes() - INDEX_TIMEOUT_IN_MINUTES - 1)
    ).toUTCString();

    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCspPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 1,
      page: 1,
      perPage: 100,
    });

    mockAgentPolicyService.getByIds.mockResolvedValue([
      { package_policies: createPackagePolicyMock() },
    ] as unknown as AgentPolicy[]);

    mockAgentClient.getAgentStatusForAgentPolicy.mockResolvedValue({
      total: 1,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspSetupStatusRoute(router, cspContext);

    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();

    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'index-timeout',
      latestPackageVersion: '0.0.14',
      installedIntegrations: 1,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
    });
  });
});
