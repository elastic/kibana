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

import { AgentlessAgentCreateError } from '../../errors';
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

  it('should throw AgentlessAgentCreateError if agentless policy does not support_agentless', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: true } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: false,
      } as AgentPolicy)
    ).rejects.toThrowError(
      new AgentlessAgentCreateError('Agentless agent policy does not have agentless enabled')
    );
  });

  it('should throw AgentlessAgentCreateError if cloud is not enabled', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getCloud').mockReturnValue({ isCloudEnabled: false } as any);

    await expect(
      agentlessAgentService.createAgentlessAgent(esClient, soClient, {
        id: 'mocked',
        name: 'agentless agent policy',
        namespace: 'default',
        supports_agentless: true,
      } as AgentPolicy)
    ).rejects.toThrowError(new AgentlessAgentCreateError('missing agentless configuration'));
  });

  it('should throw AgentlessAgentCreateError if agentless configuration is not found', async () => {
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
    ).rejects.toThrowError(new AgentlessAgentCreateError('missing agentless configuration'));
  });
  it('should throw AgentlessAgentCreateError if fleet hosts are not found', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
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
    ).rejects.toThrowError(new AgentlessAgentCreateError('missing Fleet server host'));
  });

  it('should throw AgentlessAgentCreateError if enrollment tokens are not found', async () => {
    const soClient = getAgentPolicyCreateMock();
    // ignore unrelated unique name constraint
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    jest.spyOn(appContextService, 'getConfig').mockReturnValue({
      agentless: {
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
    ).rejects.toThrowError(new AgentlessAgentCreateError('missing Fleet enrollment token'));
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
        },
        headers: expect.anything(),
        httpsAgent: expect.anything(),
        method: 'POST',
        url: 'http://api.agentless.com/api/v1/serverless/deployments',
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
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`\"cert\":\"[REDACTED]\"`),
      expect.any(Object)
    );
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`\"key\":\"[REDACTED]\"`),
      expect.any(Object)
    );
    expect(mockedLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`\"ca\":\"[REDACTED]\"`),
      expect.any(Object)
    );
  });
});
