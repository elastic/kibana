/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';
import { agentPolicyService } from './agent_policy';
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

describe('agent policy', () => {
  describe('getFullAgentPolicy', () => {
    it('should return a policy without monitoring if not monitoring is not enabled', async () => {
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
