/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { Logger } from '@kbn/core/server';

import type { AxiosError } from 'axios';
import axios from 'axios';

import { AgentlessAgentConfigError } from '../../errors';
import type { AgentPolicy, NewAgentPolicy } from '../../types';

import { appContextService } from '../app_context';
import { listEnrollmentApiKeys } from '../api_keys';
import { listFleetServerHosts } from '../fleet_server_host';

import { agentlessAgentService } from './agentless_agent';

jest.mock('axios');
// Add a mock implementation for `isAxiosError` to simulate that the error is an Axios error
(axios.isAxiosError as unknown as jest.Mock).mockImplementation(
  (error: any): error is AxiosError => {
    return error.isAxiosError === true; // Simulate that the error is an Axios error if it has `isAxiosError` property
  }
);

jest.mock('../fleet_server_host');
jest.mock('../api_keys');
jest.mock('../output');
jest.mock('../download_source');
jest.mock('../agent_policy_update');
jest.mock('../package_policy');
jest.mock('../app_context');
jest.mock('../audit_logging');
jest.mock('../agent_policies/full_agent_policy');
jest.mock('../agent_policies/outputs_helpers');

const mockedAppContextService = appContextService as jest.Mocked<typeof appContextService>;
mockedAppContextService.getSecuritySetup.mockImplementation(() => ({
  ...securityMock.createSetup(),
}));

const mockedListEnrollmentApiKeys = listEnrollmentApiKeys as jest.Mock<
  ReturnType<typeof listEnrollmentApiKeys>
>;
const mockedListFleetServerHosts = listFleetServerHosts as jest.Mock<
  ReturnType<typeof listFleetServerHosts>
>;

function getAgentPolicyCreateMock() {
  const soClient = savedObjectsClientMock.create();
  soClient.create.mockImplementation(async (type, attributes) => {
    return {
      attributes: attributes as unknown as NewAgentPolicy,
      id: 'mocked',
      type: 'mocked',
      references: [],
    };
  });
  return soClient;
}
let mockedLogger: jest.Mocked<Logger>;

jest.mock('@kbn/server-http-tools', () => ({
  ...jest.requireActual('@kbn/server-http-tools'),
  SslConfig: jest.fn().mockImplementation(({ certificate, key, certificateAuthorities }) => ({
    certificate,
    key,
    certificateAuthorities: [certificateAuthorities],
  })),
}));

describe('Agentless Agent service', () => {
  beforeEach(() => {
    mockedLogger = loggerMock.create();
    mockedAppContextService.getLogger.mockReturnValue(mockedLogger);
    mockedAppContextService.getExperimentalFeatures.mockReturnValue({ agentless: false } as any);
    (axios as jest.MockedFunction<typeof axios>).mockReset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should throw AgentlessAgentConfigError if agentless policy does not support_agentless', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com/api/v1/ess',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
          },
        },
      },
    } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: false,
      } as AgentPolicy)
    ).rejects.toThrowError(
      new AgentlessAgentConfigError(
        'Agentless agent policy does not have supports_agentless enabled'
      )
    );
  });

  it('should throw AgentlessAgentConfigError if cloud and serverless is not enabled', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: false, isServerlessEnabled: false } as any);
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com/api/v1/ess',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
          },
        },
      },
    } as any);
    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError(
      new AgentlessAgentConfigError(
        'Agentless agents are only supported in cloud deployment and serverless projects'
      )
    );
  });

  it('should throw AgentlessAgentConfigError if agentless configuration is not found', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({} as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError(
      new AgentlessAgentConfigError('missing Agentless API configuration in Kibana')
    );
  });

  it('should throw AgentlessAgentConfigError if fleet hosts are not found', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com/api/v1/ess',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({ items: [] } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked',
          policy_id: 'mocked',
          api_key: 'mocked',
        },
      ],
    } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError(new AgentlessAgentConfigError('missing default Fleet server host'));
  });

  it('should throw AgentlessAgentConfigError if enrollment tokens are not found', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com/api/v1/ess',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [],
    } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError(new AgentlessAgentConfigError('missing Fleet enrollment token'));
  });

  it('should throw an error and log and error when the Agentless API returns a status not handled and not in the 2xx series', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 999,
        data: {
          message: 'This is a fake error status that is never to be handled handled',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 500', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          message: 'Internal Server Error',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 429', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 429,
        data: {
          message: 'Limit exceeded',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 408', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 408,
        data: {
          message: 'Request timed out',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toBeCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 404', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 404,
        data: {
          message: 'Not Found',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toBeCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 403', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          message: 'Forbidden',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toBeCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 401', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          message: 'Unauthorized',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toBeCalledTimes(1);
  });

  it('should throw an error and log and error when the Agentless API returns status 400', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-policy-id',
          api_key: 'mocked-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          message: 'Bad Request',
        },
      },
    } as AxiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that the error is logged
    expect(mockedLogger.error).toBeCalledTimes(1);
  });

  it('should create agentless agent for ESS', async () => {
    const returnValue = {
      id: 'mocked',
      regional_id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(axios).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(returnValue);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fleet_token: 'mocked-fleet-enrollment-api-key',
          fleet_url: 'http://fleetserver:8220',
          policy_id: 'mocked-agentless-agent-policy-id',
          stack_version: 'mocked-kibana-version-infinite',
          labels: {
            owner: {
              org: 'elastic',
              division: 'cloud',
              team: 'fleet',
            },
          },
        }),
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'POST',
        url: 'http://api.agentless.com/api/v1/ess/deployments',
      })
    );
  });

  it('should create agentless agent for serverless', async () => {
    const returnValue = {
      id: 'mocked',
      regional_id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
        global_data_tags: [
          {
            name: 'organization',
            value: 'elastic',
          },
          {
            name: 'division',
            value: 'cloud',
          },
          {
            name: 'team',
            value: 'fleet',
          },
        ],
      } as AgentPolicy
    );

    expect(axios).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(returnValue);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          fleet_token: 'mocked-fleet-enrollment-api-key',
          fleet_url: 'http://fleetserver:8220',
          policy_id: 'mocked-agentless-agent-policy-id',
          labels: {
            owner: {
              org: 'elastic',
              division: 'cloud',
              team: 'fleet',
            },
          },
        },
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'POST',
        url: 'http://api.agentless.com/api/v1/serverless/deployments',
      })
    );
  });

  it('should create agentless agent when no labels are given', async () => {
    const returnValue = {
      id: 'mocked',
      regional_id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');
    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);
    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    const createAgentlessAgentReturnValue = await agentlessAgentService.createAgentlessAgent(
      esClient,
      soClient,
      {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy
    );

    expect(axios).toHaveBeenCalledTimes(1);
    expect(createAgentlessAgentReturnValue).toEqual(returnValue);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fleet_token: 'mocked-fleet-enrollment-api-key',
          fleet_url: 'http://fleetserver:8220',
          policy_id: 'mocked-agentless-agent-policy-id',
          stack_version: 'mocked-kibana-version-infinite',
        }),
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'POST',
        url: 'http://api.agentless.com/api/v1/ess/deployments',
      })
    );
  });

  it('should delete agentless agent for ESS', async () => {
    const returnValue = {
      id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    const deleteAgentlessAgentReturnValue = await agentlessAgentService.deleteAgentlessAgent(
      'mocked-agentless-agent-policy-id'
    );

    expect(axios).toHaveBeenCalledTimes(1);
    expect(deleteAgentlessAgentReturnValue).toEqual(returnValue);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'DELETE',
        url: 'http://api.agentless.com/api/v1/ess/deployments/mocked-agentless-agent-policy-id',
      })
    );
  });

  it('should delete agentless agent for serverless', async () => {
    const returnValue = {
      id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest
      .spyOn(appContextService, 'getCloud')
      .mockReturnValue({ isCloudEnabled: true, isServerlessEnabled: true } as any);

    const deleteAgentlessAgentReturnValue = await agentlessAgentService.deleteAgentlessAgent(
      'mocked-agentless-agent-policy-id'
    );

    expect(axios).toHaveBeenCalledTimes(1);
    expect(deleteAgentlessAgentReturnValue).toEqual(returnValue);
    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'DELETE',
        url: 'http://api.agentless.com/api/v1/serverless/deployments/mocked-agentless-agent-policy-id',
      })
    );
  });

  it('should redact sensitive information from debug logs', async () => {
    const returnValue = {
      id: 'mocked',
      regional_id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');

    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    await agentlessAgentService.createAgentlessAgent(esClient, soClient, {
      id: 'mocked-agentless-agent-policy-id',
      name: 'agentless agent policy',
      namespace: 'default',
      supports_agentless: true,
    } as AgentPolicy);

    // Assert that sensitive information is redacted
    expect(mockedLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('fleet_token: [REDACTED]')
    );
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cert: [REDACTED]'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('key: [REDACTED]'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('ca: [REDACTED]'));
  });

  it('should log "undefined" on debug logs when tls configuration is missing', async () => {
    const returnValue = {
      id: 'mocked',
      regional_id: 'mocked',
    };

    (axios as jest.MockedFunction<typeof axios>).mockResolvedValueOnce(returnValue);
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);
    jest
      .spyOn(appContextService, 'getKibanaVersion')
      .mockReturnValue('mocked-kibana-version-infinite');

    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that tls configuration is missing
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('cert: undefined'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('key: undefined'));
    expect(mockedLogger.debug).toHaveBeenCalledWith(expect.stringContaining('ca: undefined'));
  });

  it('should redact sensitive information from error logs', async () => {
    const soClient = getAgentPolicyCreateMock();
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
        enabled: true,
        api: {
          url: 'http://api.agentless.com',
          tls: {
            certificate: '/path/to/cert',
            key: '/path/to/key',
            ca: '/path/to/ca',
          },
        },
      },
    } as any);
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    mockedListFleetServerHosts.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-server-id',
          host: 'http://fleetserver:8220',
          active: true,
          is_default: true,
          host_urls: ['http://fleetserver:8220'],
        },
      ],
    } as any);

    mockedListEnrollmentApiKeys.mockResolvedValue({
      items: [
        {
          id: 'mocked-fleet-enrollment-token-id',
          policy_id: 'mocked-fleet-enrollment-policy-id',
          api_key: 'mocked-fleet-enrollment-api-key',
        },
      ],
    } as any);
    // Force axios to throw an AxiosError to simulate an error response
    const axiosError = new Error('Test Error') as AxiosError;
    axiosError.isAxiosError = true; // Mark it as an AxiosError
    (axios as jest.MockedFunction<typeof axios>).mockRejectedValueOnce(axiosError);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked-agentless-agent-policy-id',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError();

    // Assert that sensitive information is redacted
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`\"fleet_token\":\"[REDACTED]\"`),
      expect.any(Object)
    );
  });
});
