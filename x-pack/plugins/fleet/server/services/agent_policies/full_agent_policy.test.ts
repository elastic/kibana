/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from 'src/core/server/mocks';

import type { AgentPolicy, Output } from '../../types';

import { agentPolicyService } from '../agent_policy';
import { agentPolicyUpdateEventHandler } from '../agent_policy_update';

import { getFullAgentPolicy, transformOutputToFullPolicyOutput } from './full_agent_policy';
import { getMonitoringPermissions } from './monitoring_permissions';

const mockedGetElasticAgentMonitoringPermissions = getMonitoringPermissions as jest.Mock<
  ReturnType<typeof getMonitoringPermissions>
>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

function mockAgentPolicy(data: Partial<AgentPolicy>) {
  mockedAgentPolicyService.get.mockResolvedValue({
    id: 'agent-policy',
    status: 'active',
    package_policies: [],
    is_managed: false,
    namespace: 'default',
    revision: 1,
    name: 'Policy',
    updated_at: '2020-01-01',
    updated_by: 'qwerty',
    ...data,
  });
}

jest.mock('../settings', () => {
  return {
    getSettings: () => {
      return {
        id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
        fleet_server_hosts: ['http://fleetserver:8220'],
      };
    },
  };
});

jest.mock('../agent_policy');

jest.mock('../output', () => {
  return {
    outputService: {
      getDefaultDataOutputId: async () => 'test-id',
      getDefaultMonitoringOutputId: async () => 'test-id',
      get: (soClient: any, id: string): Output => {
        switch (id) {
          case 'data-output-id':
            return {
              id: 'data-output-id',
              is_default: false,
              is_default_monitoring: false,
              name: 'Data output',
              // @ts-ignore
              type: 'elasticsearch',
              hosts: ['http://es-data.co:9201'],
            };
          case 'monitoring-output-id':
            return {
              id: 'monitoring-output-id',
              is_default: false,
              is_default_monitoring: false,
              name: 'Monitoring output',
              // @ts-ignore
              type: 'elasticsearch',
              hosts: ['http://es-monitoring.co:9201'],
            };
          default:
            return {
              id: 'test-id',
              is_default: true,
              is_default_monitoring: true,
              name: 'default',
              // @ts-ignore
              type: 'elasticsearch',
              hosts: ['http://127.0.0.1:9201'],
            };
        }
      },
    },
  };
});

jest.mock('../agent_policy_update');
jest.mock('../agents');
jest.mock('../package_policy');

jest.mock('./monitoring_permissions');

function getAgentPolicyUpdateMock() {
  return agentPolicyUpdateEventHandler as unknown as jest.Mock<
    typeof agentPolicyUpdateEventHandler
  >;
}

describe('getFullAgentPolicy', () => {
  beforeEach(() => {
    getAgentPolicyUpdateMock().mockClear();
    mockedAgentPolicyService.get.mockReset();
    mockedGetElasticAgentMonitoringPermissions.mockReset();
    mockedGetElasticAgentMonitoringPermissions.mockImplementation(
      async (soClient, { logs, metrics }, namespace) => {
        const names: string[] = [];
        if (logs) {
          names.push(`logs-${namespace}`);
        }
        if (metrics) {
          names.push(`metrics-${namespace}`);
        }

        return {
          _elastic_agent_monitoring: {
            indices: [
              {
                names,
                privileges: [],
              },
            ],
          },
        };
      }
    );
  });

  it('should return a policy without monitoring if monitoring is not enabled', async () => {
    mockAgentPolicy({
      revision: 1,
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
          ca_sha256: undefined,
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
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['logs'],
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
          ca_sha256: undefined,
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
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
          ca_sha256: undefined,
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

  it('should get the permissions for monitoring', async () => {
    mockAgentPolicy({
      namespace: 'testnamespace',
      revision: 1,
      monitoring_enabled: ['metrics'],
    });
    await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(mockedGetElasticAgentMonitoringPermissions).toHaveBeenCalledWith(
      expect.anything(),
      {
        logs: false,
        metrics: true,
      },
      'testnamespace'
    );
  });

  it('should support a different monitoring output', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
      monitoring_output_id: 'monitoring-output-id',
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchSnapshot();
  });

  it('should support a different data output', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
      data_output_id: 'data-output-id',
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchSnapshot();
  });

  it('should support both different outputs for data and monitoring ', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
      data_output_id: 'data-output-id',
      monitoring_output_id: 'monitoring-output-id',
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchSnapshot();
  });

  it('should use "default" as the default policy id', async () => {
    mockAgentPolicy({
      id: 'policy',
      status: 'active',
      package_policies: [],
      is_managed: false,
      namespace: 'default',
      revision: 1,
      data_output_id: 'test-id',
      monitoring_output_id: 'test-id',
    });

    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy?.outputs.default).toBeDefined();
  });
});

describe('transformOutputToFullPolicyOutput', () => {
  it('should works with only required field on a output', () => {
    const policyOutput = transformOutputToFullPolicyOutput({
      id: 'id123',
      hosts: ['http://host.fr'],
      is_default: false,
      is_default_monitoring: false,
      name: 'test output',
      type: 'elasticsearch',
    });

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "ca_sha256": undefined,
        "hosts": Array [
          "http://host.fr",
        ],
        "type": "elasticsearch",
      }
    `);
  });
  it('should support ca_trusted_fingerprint field on a output', () => {
    const policyOutput = transformOutputToFullPolicyOutput({
      id: 'id123',
      hosts: ['http://host.fr'],
      is_default: false,
      is_default_monitoring: false,
      name: 'test output',
      type: 'elasticsearch',
      ca_trusted_fingerprint: 'fingerprint123',
      config_yaml: `
test: 1234      
ssl.test: 123
      `,
    });

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "ca_sha256": undefined,
        "hosts": Array [
          "http://host.fr",
        ],
        "ssl.ca_trusted_fingerprint": "fingerprint123",
        "ssl.test": 123,
        "test": 1234,
        "type": "elasticsearch",
      }
    `);
  });

  it('should return placeholder ES_USERNAME and ES_PASSWORD for elasticsearch output type in standalone ', () => {
    const policyOutput = transformOutputToFullPolicyOutput(
      {
        id: 'id123',
        hosts: ['http://host.fr'],
        is_default: false,
        is_default_monitoring: false,
        name: 'test output',
        type: 'elasticsearch',
      },
      true
    );

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "ca_sha256": undefined,
        "hosts": Array [
          "http://host.fr",
        ],
        "password": "{ES_PASSWORD}",
        "type": "elasticsearch",
        "username": "{ES_USERNAME}",
      }
    `);
  });

  it('should not return placeholder ES_USERNAME and ES_PASSWORD for logstash output type in standalone ', () => {
    const policyOutput = transformOutputToFullPolicyOutput(
      {
        id: 'id123',
        hosts: ['host.fr:3332'],
        is_default: false,
        is_default_monitoring: false,
        name: 'test output',
        type: 'logstash',
      },
      true
    );

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "ca_sha256": undefined,
        "hosts": Array [
          "host.fr:3332",
        ],
        "type": "logstash",
      }
    `);
  });
});
