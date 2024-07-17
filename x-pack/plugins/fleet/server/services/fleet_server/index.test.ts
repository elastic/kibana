/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { appContextService } from '..';

import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock } from '../../mocks';

import { agentPolicyService } from '../agent_policy';
import { packagePolicyService } from '../package_policy';
import { getAgentsByKuery, getAgentStatusById, getAgentStatusForAgentPolicy } from '../agents';

import {
  checkFleetServerVersionsForSecretsStorage,
  hasFleetServersForPolicies,
  getFleetServerPolicies,
} from '.';

jest.mock('../agent_policy');
jest.mock('../package_policy');
jest.mock('../agents');

const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;
const mockedPackagePolicyService = packagePolicyService as jest.Mocked<typeof packagePolicyService>;
const mockedGetAgentsByKuery = getAgentsByKuery as jest.MockedFunction<typeof getAgentsByKuery>;
const mockedGetAgentStatusById = getAgentStatusById as jest.MockedFunction<
  typeof getAgentStatusById
>;

describe('checkFleetServerVersionsForSecretsStorage', () => {
  let mockContext: MockedFleetAppContext;

  beforeEach(() => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  const soClientMock = savedObjectsClientMock.create();

  it('should return true if all fleet server versions are at least the specified version and there are no managed policies', async () => {
    const version = '1.0.0';

    mockedPackagePolicyService.list
      .mockResolvedValueOnce({
        items: [
          {
            id: '1',
            policy_id: '1',
            policy_ids: ['1'],
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
          {
            id: '2',
            policy_id: '2',
            policy_ids: ['2'],
            package: {
              name: 'fleet_server',
              version: '10.0.0',
            },
          },
        ],
      } as any)
      .mockResolvedValueOnce({
        items: [],
      } as any);

    mockedAgentPolicyService.getAllManagedAgentPolicies.mockResolvedValueOnce([]);

    mockedGetAgentsByKuery.mockResolvedValueOnce({
      agents: [
        {
          id: '1',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
        {
          id: '2',
          local_metadata: {
            elastic: {
              agent: {
                version: '10.0.0',
              },
            },
          },
        },
      ],
    } as any);

    mockedGetAgentStatusById.mockResolvedValue('online');

    const result = await checkFleetServerVersionsForSecretsStorage(
      esClientMock,
      soClientMock,
      version
    );
    expect(result).toBe(true);
    expect(mockedGetAgentsByKuery).toHaveBeenCalledWith(
      esClientMock,
      soClientMock,
      expect.objectContaining({
        kuery: 'policy_id:("1" or "2")',
      })
    );
  });
});

describe('getFleetServerPolicies', () => {
  const soClient = savedObjectsClientMock.create();
  const mockPackagePolicies = [
    {
      id: 'package-policy-1',
      name: 'Package Policy 1',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-1',
      policy_ids: ['fs-policy-1'],
    },
    {
      id: 'package-policy-2',
      name: 'Package Policy 2',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.0.0',
      },
      policy_id: 'fs-policy-2',
      policy_ids: ['fs-policy-2'],
    },
    {
      id: 'package-policy-3',
      name: 'Package Policy 3',
      package: {
        name: 'system',
        title: 'System',
        version: '1.0.0',
      },
      policy_id: 'agent-policy-2',
      policy_ids: ['agent-policy-2'],
    },
  ];
  const mockFleetServerPolicies = [
    {
      id: 'fs-policy-1',
      name: 'FS Policy 1',
      is_managed: true,
      is_default_fleet_server: true,
      has_fleet_server: true,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
    {
      id: 'fs-policy-2',
      name: 'FS Policy 2',
      is_managed: true,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
  ];

  it('should return no policies if there are no fleet server package policies', async () => {
    (mockedPackagePolicyService.list as jest.Mock).mockResolvedValueOnce({
      items: [],
    });
    const result = await getFleetServerPolicies(soClient);
    expect(result).toEqual([]);
  });

  it('should return agent policies with fleet server package policies', async () => {
    (mockedPackagePolicyService.list as jest.Mock).mockResolvedValueOnce({
      items: mockPackagePolicies,
    });
    (mockedAgentPolicyService.getByIDs as jest.Mock).mockResolvedValueOnce(mockFleetServerPolicies);
    const result = await getFleetServerPolicies(soClient);
    expect(result).toEqual(mockFleetServerPolicies);
  });
});

describe('hasActiveFleetServersForPolicies', () => {
  const mockSoClient = savedObjectsClientMock.create();
  const mockEsClient = elasticsearchServiceMock.createInternalClient();

  it('returns false when no agent IDs are provided', async () => {
    const hasFs = await hasFleetServersForPolicies(mockEsClient, mockSoClient, []);
    expect(hasFs).toBe(false);
  });

  describe('activeOnly is true', () => {
    it('returns true when at least one agent is online', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 1,
        all: 1,
        active: 0,
        updating: 0,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        online: 1,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(true);
    });

    it('returns true when at least one agent is updating', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 1,
        all: 1,
        active: 0,
        updating: 1,
        offline: 0,
        inactive: 0,
        unenrolled: 0,
        online: 0,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(true);
    });

    it('returns false when no agents are updating or online', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 3,
        all: 3,
        active: 1,
        updating: 0,
        offline: 1,
        inactive: 1,
        unenrolled: 1,
        online: 0,
        error: 1,
      });
      const hasFs = await hasFleetServersForPolicies(
        mockEsClient,
        mockSoClient,
        [{ id: 'policy-1' }],
        true
      );
      expect(hasFs).toBe(false);
    });
  });

  describe('activeOnly is false', () => {
    it('returns true when at least one agent is found regardless of its status', async () => {
      (getAgentStatusForAgentPolicy as jest.Mock).mockResolvedValueOnce({
        other: 0,
        events: 0,
        total: 0,
        all: 1,
        active: 0,
        updating: 0,
        offline: 1,
        inactive: 0,
        unenrolled: 0,
        online: 0,
        error: 0,
      });
      const hasFs = await hasFleetServersForPolicies(mockEsClient, mockSoClient, [
        { id: 'policy-1' },
      ]);
      expect(hasFs).toBe(true);
    });
  });
});
