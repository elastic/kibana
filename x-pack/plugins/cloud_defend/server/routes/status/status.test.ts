/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineGetCloudDefendStatusRoute, INDEX_TIMEOUT_IN_MINUTES } from './status';
import { httpServerMock } from '@kbn/core/server/mocks';
import { mockRouter } from '@kbn/core-http-router-server-mocks';
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
import { createCloudDefendRequestHandlerContextMock } from '../../mocks';
import { errors } from '@elastic/elasticsearch';

const mockCloudDefendPackageInfo: Installation = {
  verification_status: 'verified',
  installed_kibana: [],
  installed_kibana_space_id: 'default',
  installed_es: [],
  package_assets: [],
  es_index_patterns: [{ name: 'alerts', pattern: 'logs-cloud_defend.alerts-*' }],
  name: 'cloud_defend',
  version: '1.0.0',
  install_version: '1.0.0',
  install_status: 'installed',
  install_started_at: '2022-06-16T15:24:58.281Z',
  install_source: 'registry',
};

const mockLatestCloudDefendPackageInfo: RegistryPackage = {
  format_version: 'mock',
  name: 'cloud_defend',
  title: 'Defend for containers (D4C)',
  version: '1.0.0',
  release: 'experimental',
  description: 'Container drift prevention',
  type: 'integration',
  download: '/epr/cloud_defend/cloud_defend-1.0.0.zip',
  path: '/package/cloud_defend/1.0.0',
  policy_templates: [],
  owner: { github: 'elastic/kibana-cloud-security-posture' },
  categories: ['containers', 'kubernetes'],
};

describe('CloudDefendSetupStatus route', () => {
  const router = mockRouter.create();

  let mockContext: ReturnType<typeof createCloudDefendRequestHandlerContextMock>;
  let mockPackagePolicyService: jest.Mocked<PackagePolicyClient>;
  let mockAgentPolicyService: jest.Mocked<AgentPolicyServiceInterface>;
  let mockAgentService: jest.Mocked<AgentService>;
  let mockAgentClient: jest.Mocked<AgentClient>;
  let mockPackageService: PackageService;
  let mockPackageClient: jest.Mocked<PackageClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = createCloudDefendRequestHandlerContextMock();
    mockPackagePolicyService = mockContext.cloudDefend.packagePolicyService;
    mockAgentPolicyService = mockContext.cloudDefend.agentPolicyService;
    mockAgentService = mockContext.cloudDefend.agentService;
    mockPackageService = mockContext.cloudDefend.packageService;

    mockAgentClient = mockAgentService.asInternalUser as jest.Mocked<AgentClient>;
    mockPackageClient = mockPackageService.asInternalUser as jest.Mocked<PackageClient>;
  });

  it('validate the API route path', async () => {
    defineGetCloudDefendStatusRoute(router);

    const [config, _] = (router.versioned.get as jest.Mock).mock.calls[0];

    expect(config.path).toEqual('/internal/cloud_defend/status');
  });

  const indices = [
    {
      index: 'logs-cloud_defend.alerts-default*',
      expected_status: 'not-installed',
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
        mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
          mockLatestCloudDefendPackageInfo
        );

        mockPackagePolicyService.list.mockResolvedValueOnce({
          items: [],
          total: 0,
          page: 1,
          perPage: 100,
        });

        // Act
        const route = defineGetCloudDefendStatusRoute(router);
        const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

        const mockResponse = httpServerMock.createResponseFactory();
        const mockRequest = httpServerMock.createKibanaRequest();
        await handler(mockContext, mockRequest, mockResponse);

        // Assert
        const [call] = mockResponse.ok.mock.calls;
        const body = call[0]?.body;
        expect(mockResponse.ok).toHaveBeenCalledTimes(1);

        expect(body).toMatchObject({
          status: idxTestCase.expected_status,
        });
      }
    );
  });

  it('Verify the API result when there are alerts and no installed policies', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Alerts: 'foo' }],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
    });

    // Act
    const route = defineGetCloudDefendStatusRoute(router);
    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;
    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 0,
      healthyAgents: 0,
      installedPackageVersion: undefined,
    });
  });

  it('Verify the API result when there are alerts, installed policies, no running agents', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Alerts: 'foo' }],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCloudDefendPackageInfo);

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 3,
      page: 1,
      perPage: 100,
    });

    // Act
    const route = defineGetCloudDefendStatusRoute(router);
    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]?.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 3,
      healthyAgents: 0,
      installedPackageVersion: '1.0.0',
    });
  });

  it('Verify the API result when there are alerts, installed policies, running agents', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [{ Alerts: 'foo' }],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCloudDefendPackageInfo);

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
    const route = defineGetCloudDefendStatusRoute(router);
    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'indexed',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 3,
      healthyAgents: 1,
      installedPackageVersion: '1.0.0',
    });
  });

  it('Verify the API result when there are no alerts and no installed policies', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );

    mockPackagePolicyService.list.mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      perPage: 100,
    });
    const route = defineGetCloudDefendStatusRoute(router);
    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();

    // Act
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'not-installed',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 0,
      healthyAgents: 0,
    });
  });

  it('Verify the API result when there are no alerts, installed agent but no deployed agent', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);

    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );
    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCloudDefendPackageInfo);

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
    const route = defineGetCloudDefendStatusRoute(router);

    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'not-deployed',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 1,
      healthyAgents: 0,
      installedPackageVersion: '1.0.0',
    });
  });

  it('Verify the API result when there are no alerts, installed agent, deployed agent, before index timeout', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );

    const currentTime = new Date();
    mockCloudDefendPackageInfo.install_started_at = new Date(
      currentTime.setMinutes(currentTime.getMinutes() - INDEX_TIMEOUT_IN_MINUTES + 1)
    ).toUTCString();

    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCloudDefendPackageInfo);

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
    const route = defineGetCloudDefendStatusRoute(router);

    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();
    const [context, req, res] = [mockContext, mockRequest, mockResponse];

    await handler(context, req, res);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'indexing',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 1,
      healthyAgents: 1,
      installedPackageVersion: '1.0.0',
    });
  });

  it('Verify the API result when there are no alerts, installed agent, deployed agent, after index timeout', async () => {
    mockContext.core.elasticsearch.client.asCurrentUser.search.mockResponseOnce({
      hits: {
        hits: [],
      },
    } as unknown as ESSearchResponse);
    mockPackageClient.fetchFindLatestPackage.mockResolvedValueOnce(
      mockLatestCloudDefendPackageInfo
    );

    const currentTime = new Date();
    mockCloudDefendPackageInfo.install_started_at = new Date(
      currentTime.setMinutes(currentTime.getMinutes() - INDEX_TIMEOUT_IN_MINUTES - 1)
    ).toUTCString();

    mockPackageClient.getInstallation.mockResolvedValueOnce(mockCloudDefendPackageInfo);

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
    const route = defineGetCloudDefendStatusRoute(router);

    const [_, handler] = (route.addVersion as jest.Mock).mock.calls[0];

    const mockResponse = httpServerMock.createResponseFactory();
    const mockRequest = httpServerMock.createKibanaRequest();

    await handler(mockContext, mockRequest, mockResponse);

    // Assert
    const [call] = mockResponse.ok.mock.calls;
    const body = call[0]!.body;

    expect(mockResponse.ok).toHaveBeenCalledTimes(1);

    expect(body).toMatchObject({
      status: 'index-timeout',
      latestPackageVersion: '1.0.0',
      installedPackagePolicies: 1,
      healthyAgents: 1,
      installedPackageVersion: '1.0.0',
    });
  });
});
