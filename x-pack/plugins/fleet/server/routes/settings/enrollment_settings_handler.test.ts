/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { agentPolicyService } from '../../services';
import { getFleetServerPolicies } from '../../services/fleet_server';

import { getFleetServerOrAgentPolicies, getDownloadSource } from './enrollment_settings_handler';

jest.mock('../../services', () => ({
  agentPolicyService: {
    get: jest.fn(),
    getByIDs: jest.fn(),
  },
  downloadSourceService: {
    list: jest.fn().mockResolvedValue({
      items: [
        {
          id: 'source-1',
          name: 'Source 1',
          host: 'https://source-1/',
          is_default: true,
        },
        {
          id: 'source-2',
          name: 'Source 2',
          host: 'https://source-2/',
          is_default: false,
          proxy_id: 'proxy-1',
        },
      ],
    }),
  },
}));

jest.mock('../../services/fleet_server', () => ({
  getFleetServerPolicies: jest.fn(),
}));

describe('EnrollmentSettingsHandler utils', () => {
  const mockSoClient = savedObjectsClientMock.create();
  const mockAgentPolicies = [
    {
      id: 'agent-policy-1',
      name: 'Agent Policy 1',
      is_managed: false,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
    {
      id: 'agent-policy-2',
      name: 'Agent Policy 2',
      is_managed: false,
      is_default_fleet_server: false,
      has_fleet_server: false,
      download_source_id: undefined,
      fleet_server_host_id: undefined,
    },
  ];
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

  describe('getFleetServerOrAgentPolicies', () => {
    it('returns only fleet server policies if there are any when no agent policy ID is provided', async () => {
      (getFleetServerPolicies as jest.Mock).mockResolvedValueOnce(mockFleetServerPolicies);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient
      );
      expect(fleetServerPolicies).toEqual(mockFleetServerPolicies);
      expect(scopedAgentPolicy).toBeUndefined();
    });

    it('returns no fleet server policies when there are none and no agent policy ID is provided', async () => {
      (getFleetServerPolicies as jest.Mock).mockResolvedValueOnce([]);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient
      );
      expect(fleetServerPolicies).toEqual([]);
      expect(scopedAgentPolicy).toBeUndefined();
    });

    it('returns fleet server policy when specified agent policy ID is a fleet server policy', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce({
        ...mockFleetServerPolicies[1],
        package_policies: [mockPackagePolicies[1]],
      });
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'fs-policy-2'
      );
      expect(fleetServerPolicies).toEqual([mockFleetServerPolicies[1]]);
      expect(scopedAgentPolicy).toEqual(mockFleetServerPolicies[1]);
    });

    it('returns scoped agent policy when specified agent policy ID is not a fleet server policy', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce({
        ...mockAgentPolicies[1],
        package_policies: [mockPackagePolicies[2]],
      });
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'agent-policy-2'
      );
      expect(fleetServerPolicies).toBeUndefined();
      expect(scopedAgentPolicy).toEqual(mockAgentPolicies[1]);
    });

    it('returns no policies when specified agent policy ID is not found', async () => {
      (agentPolicyService.get as jest.Mock).mockResolvedValueOnce(undefined);
      const { fleetServerPolicies, scopedAgentPolicy } = await getFleetServerOrAgentPolicies(
        mockSoClient,
        'agent-policy-3'
      );
      expect(fleetServerPolicies).toBeUndefined();
      expect(scopedAgentPolicy).toBeUndefined();
    });
  });

  describe('getDownloadSource', () => {
    it('returns the default download source when no id is specified', async () => {
      const source = await getDownloadSource(mockSoClient);
      expect(source).toEqual({
        id: 'source-1',
        name: 'Source 1',
        host: 'https://source-1/',
        is_default: true,
      });
    });

    it('returns the default download source when the specified id is not found', async () => {
      const source = await getDownloadSource(mockSoClient, 'some-id');
      expect(source).toEqual({
        id: 'source-1',
        name: 'Source 1',
        host: 'https://source-1/',
        is_default: true,
      });
    });

    it('returns the correct download source when an id is specified', async () => {
      const source = await getDownloadSource(mockSoClient, 'source-2');
      expect(source).toEqual({
        id: 'source-2',
        name: 'Source 2',
        host: 'https://source-2/',
        is_default: false,
        proxy_id: 'proxy-1',
      });
    });
  });
});
