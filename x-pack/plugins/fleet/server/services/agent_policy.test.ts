/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { agentPolicyService } from './agent_policy';
import { agentPolicyUpdateEventHandler } from './agent_policy_update';
import { Output } from '../types';

function getSavedObjectMock(agentPolicyAttributes: any) {
  const mock = savedObjectsClientMock.create();

  mock.get.mockImplementation(async (type: string, id: string) => {
    return {
      type,
      id,
      references: [],
      attributes: agentPolicyAttributes,
    };
  });
  mock.find.mockImplementation(async (options) => {
    return {
      saved_objects: [
        {
          id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
          attributes: {
            kibana_urls: ['http://localhost:5603'],
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

function getAgentPolicyUpdateMock() {
  return (agentPolicyUpdateEventHandler as unknown) as jest.Mock<
    typeof agentPolicyUpdateEventHandler
  >;
}

describe('agent policy', () => {
  beforeEach(() => {
    getAgentPolicyUpdateMock().mockClear();
  });
  describe('bumpRevision', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      await agentPolicyService.bumpRevision(soClient, 'agent-policy');

      expect(agentPolicyUpdateEventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('bumpAllAgentPolicies', () => {
    it('should call agentPolicyUpdateEventHandler with updated event once', async () => {
      const soClient = getSavedObjectMock({
        revision: 1,
        monitoring_enabled: ['metrics'],
      });
      await agentPolicyService.bumpAllAgentPolicies(soClient);

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
          kibana: {
            hosts: ['localhost:5603'],
            protocol: 'http',
          },
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
          kibana: {
            hosts: ['localhost:5603'],
            protocol: 'http',
          },
        },
        agent: {
          monitoring: {
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
          kibana: {
            hosts: ['localhost:5603'],
            protocol: 'http',
          },
        },
        agent: {
          monitoring: {
            use_output: 'default',
            enabled: true,
            logs: false,
            metrics: true,
          },
        },
      });
    });
  });
});
