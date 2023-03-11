/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineGetCspStatusRoute, INDEX_TIMEOUT_IN_MINUTES } from './status';
import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { ESSearchResponse } from '@kbn/es-types';
import {
  AgentClient,
  AgentPolicyServiceInterface,
  AgentService,
  PackageClient,
  PackagePolicyClient,
  PackageService,
} from '@kbn/fleet-plugin/server';
import {
  AgentPolicy,
  GetAgentStatusResponse,
  Installation,
  RegistryPackage,
} from '@kbn/fleet-plugin/common';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { createCspRequestHandlerContextMock } from '../../mocks';
import { errors } from '@elastic/elasticsearch';

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
  let mockContext: ReturnType<typeof createCspRequestHandlerContextMock>;
  let mockPackagePolicyService: jest.Mocked<PackagePolicyClient>;
  let mockAgentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockAgentClient: jest.Mocked<AgentClient>;
  let mockPackageService: PackageService;
  let mockPackageClient: jest.Mocked<PackageClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = createCspRequestHandlerContextMock();
    mockPackagePolicyService = mockContext.csp.packagePolicyService;
    mockAgentPolicyService = mockContext.csp.agentPolicyService;
    mockAgentService = mockContext.csp.agentService;
    mockPackageService = mockContext.csp.packageService;

    mockAgentClient = mockAgentService.asInternalUser as jest.Mocked<AgentClient>;
    mockPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;
  });

  it('validate the API route path', async () => {
    defineGetCspStatusRoute(router);
    const [config, _] = router.get.mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_security_posture/status');
  });

  const indices = [
    {
      index: 'logs-cloud_security_posture.findings-default*',
      expected_status: 'not-installed',
    },
    {
      index: 'logs-cloud_security_posture.findings_latest-default',
      expected_status: 'unprivileged',
    },
    {
      index: 'logs-cloud_security_posture.scores-default',
      expected_status: 'unprivileged',
    },
  ];

  indices.forEach((idxTestCase) => {
    it(
      'Verify the API result when there are no permissions to index: ' + idxTestCase.index,
      async () => {
        mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseImplementation(
          (req) => {
            if (req?.index === idxTestCase.index) {
              throw new errors.ResponseError({
                body: {
                  error: {
                    type: 'security_exception',
                  },
                },
                statusCode: 503,
                headers: {},
                warnings: [],
                meta: {} as any,
              });
            }

            return {
              hits: {
                hits: [{}],
              },
            } as any;
          }
        );
        mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(mockLatestCspPackageInfo);

        mockPackagePolicyService.list.mockResolvedValueOnce({
          items: [],
          total: 0,
          page: 1,
          perPage: 100,
        });

        // Act
        defineGetCspStatusRoute(router);
        const [_, handler] = router.get.mock.calls[0];

        const mockResponse = httpServerMock.createResponseFactory();
        const mockRequest = httpServerMock.createKibanaRequest();
        await handler(mockContext, mockRequest, mockResponse);

        // Assert
        const [call] = mockResponse.ok.mock.calls;
        const body = call[0]?.body;
        expect(mockResponse.ok).toHaveBeenCalledTimes(1);

        await expect(body).toMatchObject({
          status: idxTestCase.expected_status,
        });
      }
    );
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
    defineGetCspStatusRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;
    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedPackagePolicies: 0,
      healthyAgents: 0,
      installedPackageVersion: undefined,
      isPluginInitialized: false,
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
    defineGetCspStatusRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedPackagePolicies: 3,
      healthyAgents: 0,
      installedPackageVersion: '0.0.14',
      isPluginInitialized: false,
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
      online: 1,
      updating: 0,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspStatusRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '0.0.14',
      installedPackagePolicies: 3,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
      isPluginInitialized: false,
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
    defineGetCspStatusRoute(router);
    const [_, handler] = router.get.mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();

    // Act
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    await expect(body).toMatchObject({
      status: 'not-installed',
      latestPackageVersion: '0.0.14',
      installedPackagePolicies: 0,
      healthyAgents: 0,
      isPluginInitialized: false,
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
      online: 0,
      updating: 0,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspStatusRoute(router);

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
      installedPackagePolicies: 1,
      healthyAgents: 0,
      installedPackageVersion: '0.0.14',
      isPluginInitialized: false,
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
      online: 1,
      updating: 0,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspStatusRoute(router);

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
      installedPackagePolicies: 1,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
      isPluginInitialized: false,
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
      online: 1,
      updating: 0,
    } as unknown as GetAgentStatusResponse['results']);

    // Act
    defineGetCspStatusRoute(router);

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
      installedPackagePolicies: 1,
      healthyAgents: 1,
      installedPackageVersion: '0.0.14',
      isPluginInitialized: false,
    });
  });
});
