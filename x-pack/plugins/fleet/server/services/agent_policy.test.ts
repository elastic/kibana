/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import type { AgentPolicy, NewAgentPolicy, Output } from '../types';

import { agentPolicyService } from './agent_policy';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';

import { getAgentsByKuery } from './agents';
import { packagePolicyService } from './package_policy';

function getSavedObjectMock(agentPolicyAttributes: any) {
  const mock = savedObjectsClientMock.create();
  mock.get.mockImplementation(async (type: string, id: string) => {
    return {
      type,
      id,
      references: [],
      attributes: agentPolicyAttributes as AgentPolicy,
    };
  });
  mock.find.mockImplementation(async (options) => {
    return {
      saved_objects: [
        {
          id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
          attributes: {
            fleet_server_hosts: ['http://fleetserver:8220'],
          },
          type: 'ingest_manager_settings',
          score: 1,
          references: [],
        },
      ],
      total: 1,
      page: 1,
      per_page: 1,
    };
  });

  return mock;
}

jest.mock('./output', () => {
  return {
    outputService: {
      getDefaultOutputId: () => 'test-id',
      get: (): Output => {
        return {
          id: 'test-id',
          is_default: true,
          name: 'default',
          // @ts-ignore
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
        };
      },
    },
  };
});

jest.mock('./agent_policy_update');
jest.mock('./agents');
jest.mock('./package_policy');

function getAgentPolicyUpdateMock() {
  return (agentPolicyUpdateEventHandler as unknown) as jest.Mock<
    typeof agentPolicyUpdateEventHandler
  >;
}

function getAgentPolicyCreateMock() {
  const soClient = savedObjectsClientMock.create();
  soClient.create.mockImplementation(async (type, attributes) => {
    return {
      attributes: (attributes as unknown) as NewAgentPolicy,
      id: 'mocked',
      type: 'mocked',
      references: [],
    };
  });
  return soClient;
}
describe('agent policy', () => {
  beforeEach(() => {
    getAgentPolicyUpdateMock().mockClear();
  });

  describe('create', () => {
    it('is_managed present and false by default', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'No is_managed provided',
          namespace: 'default',
        })
      ).resolves.toHaveProperty('is_managed', false);

      const [, attributes] = soClient.create.mock.calls[0];
      expect(attributes).toHaveProperty('is_managed', false);
    });

    it('should set is_managed property, if given', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = getAgentPolicyCreateMock();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      await expect(
        agentPolicyService.create(soClient, esClient, {
          name: 'is_managed: true provided',
          namespace: 'default',
          is_managed: true,
        })
      ).resolves.toHaveProperty('is_managed', true);

      const [, attributes] = soClient.create.mock.calls[0];
      expect(attributes).toHaveProperty('is_managed', true);
    });
  });

  describe('delete', () => {
    let soClient: ReturnType<typeof savedObjectsClientMock.create>;
    let esClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>['asInternalUser'];

    beforeEach(() => {
      soClient = getSavedObjectMock({ revision: 1, package_policies: ['package-1'] });
      esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      (getAgentsByKuery as jest.Mock).mockResolvedValue({
        agents: [],
        total: 0,
        page: 1,
        perPage: 10,
      });

      (packagePolicyService.delete as jest.Mock).mockResolvedValue([
        {
          id: 'package-1',
        },
      ]);
    });

    it('should run package policy delete external callbacks', async () => {
      await agentPolicyService.delete(soClient, esClient, 'mocked');
      expect(packagePolicyService.runDeleteExternalCallbacks).toHaveBeenCalledWith([
        { id: 'package-1' },
      ]);
    });
  });

  describe('bumpRevision', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpRevision(soClient, esClient, 'agent-policy');

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('bumpAllAgentPolicies', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      await agentPolicyService.bumpAllAgentPolicies(soClient, esClient, undefined);

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getFullAgentPolicy', () => {
    it('should return a policy without monitoring if monitoring is not enabled', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
      });
      const agentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, 'agent-policy');

      expect(agentPolicy).toMatchObject({
        id: 'agent-policy',
        outputs: {
          default: {
            type: 'elasticsearch',
            hosts: ['http://127.0.0.1:9201'],
            ca_sha256: undefined,
            api_key: undefined,
          },
        },
        inputs: [],
        revision: 1,
        fleet: {
          hosts: ['http://fleetserver:8220'],
        },
        agent: {
          monitoring: {
            enabled: false,
            logs: false,
            metrics: false,
          },
        },
      });
    });

    it('should return a policy with monitoring if monitoring is enabled for logs', async () => {
      const soClient = getSavedObjectMock({
        namespace: 'default',
        revision: 1,
        monitoring_enabled: ['logs'],
      });
      const agentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, 'agent-policy');

      expect(agentPolicy).toMatchObject({
        id: 'agent-policy',
        outputs: {
          default: {
            type: 'elasticsearch',
            hosts: ['http://127.0.0.1:9201'],
            ca_sha256: undefined,
            api_key: undefined,
          },
        },
        inputs: [],
        revision: 1,
        fleet: {
          hosts: ['http://fleetserver:8220'],
        },
        agent: {
          monitoring: {
            namespace: 'default',
            use_output: 'default',
            enabled: true,
            logs: true,
            metrics: false,
          },
        },
      });
    });

    it('should return a policy with monitoring if monitoring is enabled for metrics', async () => {
      const soClient = getSavedObjectMock({
        namespace: 'default',
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      const agentPolicy = await agentPolicyService.getFullAgentPolicy(soClient, 'agent-policy');

      expect(agentPolicy).toMatchObject({
        id: 'agent-policy',
        outputs: {
          default: {
            type: 'elasticsearch',
            hosts: ['http://127.0.0.1:9201'],
            ca_sha256: undefined,
            api_key: undefined,
          },
        },
        inputs: [],
        revision: 1,
        fleet: {
          hosts: ['http://fleetserver:8220'],
        },
        agent: {
          monitoring: {
            namespace: 'default',
            use_output: 'default',
            enabled: true,
            logs: false,
            metrics: true,
          },
        },
      });
    });
  });

  describe('update', () => {
    it('should update is_managed property, if given', async () => {
      // ignore unrelated unique name constraint
      agentPolicyService.requireUniqueName = async () => {};
      const soClient = savedObjectsClientMock.create();
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;

      soClient.get.mockResolvedValue({
        attributes: {},
        id: 'mocked',
        type: 'mocked',
        references: [],
      });
      await agentPolicyService.update(soClient, esClient, 'mocked', {
        name: 'mocked',
        namespace: 'default',
        is_managed: false,
      });
      // soClient.update is called with updated values
      let calledWith = soClient.update.mock.calls[0];
      expect(calledWith[2]).toHaveProperty('is_managed', false);

      await agentPolicyService.update(soClient, esClient, 'mocked', {
        name: 'is_managed: true provided',
        namespace: 'default',
        is_managed: true,
      });
      // soClient.update is called with updated values
      calledWith = soClient.update.mock.calls[1];
      expect(calledWith[2]).toHaveProperty('is_managed', true);
    });
  });
});
