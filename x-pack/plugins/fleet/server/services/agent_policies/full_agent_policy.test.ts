/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { AgentPolicy, Output, DownloadSource } from '../../types';
import { createAppContextStartContractMock } from '../../mocks';

import { agentPolicyService } from '../agent_policy';
import { agentPolicyUpdateEventHandler } from '../agent_policy_update';
import { appContextService } from '../app_context';

import {
  generateFleetConfig,
  getFullAgentPolicy,
  transformOutputToFullPolicyOutput,
} from './full_agent_policy';
import { getMonitoringPermissions } from './monitoring_permissions';

const mockedGetElasticAgentMonitoringPermissions = getMonitoringPermissions as jest.Mock<
  ReturnType<typeof getMonitoringPermissions>
>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const soClientMock = savedObjectsClientMock.create();

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

jest.mock('../fleet_server_host', () => {
  return {
    getFleetServerHostsForAgentPolicy: async () => {
      return {
        id: '93f74c0-e876-11ea-b7d3-8b2acec6f75c',
        is_default: true,
        host_urls: ['http://fleetserver:8220'],
      };
    },
  };
});

jest.mock('../agent_policy');

jest.mock('../output', () => {
  const OUTPUTS: { [k: string]: Output } = {
    'data-output-id': {
      id: 'data-output-id',
      is_default: false,
      is_default_monitoring: false,
      name: 'Data output',
      // @ts-ignore
      type: 'elasticsearch',
      hosts: ['http://es-data.co:9201'],
    },
    'monitoring-output-id': {
      id: 'monitoring-output-id',
      is_default: false,
      is_default_monitoring: false,
      name: 'Monitoring output',
      // @ts-ignore
      type: 'elasticsearch',
      hosts: ['http://es-monitoring.co:9201'],
    },
    'test-id': {
      id: 'test-id',
      is_default: true,
      is_default_monitoring: true,
      name: 'default',
      // @ts-ignore
      type: 'elasticsearch',
      hosts: ['http://127.0.0.1:9201'],
    },
  };
  return {
    outputService: {
      getDefaultDataOutputId: async () => 'test-id',
      getDefaultMonitoringOutputId: async () => 'test-id',
      get: (soClient: any, id: string): Output => OUTPUTS[id] || OUTPUTS['test-id'],
      bulkGet: async (soClient: any, ids: string[]): Promise<Output[]> => {
        return ids.map((id) => OUTPUTS[id] || OUTPUTS['test-id']);
      },
    },
  };
});

jest.mock('../agent_policy_update');
jest.mock('../agents');
jest.mock('../package_policy');

jest.mock('./monitoring_permissions');

jest.mock('../download_source', () => {
  return {
    downloadSourceService: {
      getDefaultDownloadSourceId: async () => 'default-download-source-id',
      get: async (soClient: any, id: string): Promise<DownloadSource> => {
        if (id === 'test-ds-1') {
          return {
            id: 'test-ds-1',
            is_default: false,
            name: 'Test',
            host: 'http://custom-registry-test',
          };
        }
        return {
          id: 'default-download-source-id',
          is_default: true,
          name: 'Default host',
          host: 'http://default-registry.co',
        };
      },
    },
  };
});

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
    soClientMock.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'default-download-source-id',
          is_default: true,
          attributes: {
            download_source_id: 'test-source-id',
          },
        },
        {
          id: 'test-ds-1',
          attributes: {
            download_source_id: 'test-ds-1',
          },
        },
      ],
    } as any);
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
        },
      },
      inputs: [],
      revision: 1,
      fleet: {
        hosts: ['http://fleetserver:8220'],
      },
      agent: {
        download: {
          sourceURI: 'http://default-registry.co',
        },
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
        },
      },
      inputs: [],
      revision: 1,
      fleet: {
        hosts: ['http://fleetserver:8220'],
      },
      agent: {
        download: {
          sourceURI: 'http://default-registry.co',
        },
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

  it('should return the sourceURI from the agent policy', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
      download_source_id: 'test-ds-1',
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
        },
      },
      inputs: [],
      revision: 1,
      fleet: {
        hosts: ['http://fleetserver:8220'],
      },
      agent: {
        download: {
          sourceURI: 'http://custom-registry-test',
        },
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

  it('should add + transform agent features', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['metrics'],
      agent_features: [
        { name: 'fqdn', enabled: true },
        { name: 'feature2', enabled: true },
      ],
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      outputs: {
        default: {
          type: 'elasticsearch',
          hosts: ['http://127.0.0.1:9201'],
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
        features: {
          fqdn: {
            enabled: true,
          },
          feature2: {
            enabled: true,
          },
        },
      },
    });
  });

  it('should populate agent.protection and signed properties if encryption is available', async () => {
    const mockContext = createAppContextStartContractMock();
    mockContext.messageSigningService.sign = jest
      .fn()
      .mockImplementation((message: Record<string, unknown>) =>
        Promise.resolve({
          data: Buffer.from(JSON.stringify(message), 'utf8'),
          signature: 'thisisasignature',
        })
      );
    mockContext.messageSigningService.getPublicKey = jest
      .fn()
      .mockResolvedValue('thisisapublickey');
    appContextService.start(mockContext);

    mockAgentPolicy({});
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy!.agent!.protection).toMatchObject({
      enabled: false,
      uninstall_token_hash: '',
      signing_key: 'thisisapublickey',
    });
    expect(agentPolicy!.signed).toMatchObject({
      data: 'eyJpZCI6ImFnZW50LXBvbGljeSIsImFnZW50Ijp7InByb3RlY3Rpb24iOnsiZW5hYmxlZCI6ZmFsc2UsInVuaW5zdGFsbF90b2tlbl9oYXNoIjoiIiwic2lnbmluZ19rZXkiOiJ0aGlzaXNhcHVibGlja2V5In19fQ==',
      signature: 'thisisasignature',
    });
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

  it('should works with proxy', () => {
    const policyOutput = transformOutputToFullPolicyOutput(
      {
        id: 'id123',
        hosts: ['http://host.fr'],
        is_default: false,
        is_default_monitoring: false,
        name: 'test output',
        type: 'elasticsearch',
        proxy_id: 'proxy-1',
      },
      {
        id: 'proxy-1',
        name: 'Proxy 1',
        url: 'https://proxy1.fr',
        is_preconfigured: false,
      }
    );

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "http://host.fr",
        ],
        "proxy_url": "https://proxy1.fr",
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
      undefined,
      true
    );

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "http://host.fr",
        ],
        "password": "\${ES_PASSWORD}",
        "type": "elasticsearch",
        "username": "\${ES_USERNAME}",
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
      undefined,
      true
    );

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "host.fr:3332",
        ],
        "type": "logstash",
      }
    `);
  });
});

describe('generateFleetConfig', () => {
  it('should work without proxy', () => {
    const res = generateFleetConfig(
      {
        host_urls: ['https://test.fr'],
      } as any,
      []
    );

    expect(res).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "https://test.fr",
        ],
      }
    `);
  });

  it('should work with proxy', () => {
    const res = generateFleetConfig(
      {
        host_urls: ['https://test.fr'],
        proxy_id: 'proxy-1',
      } as any,
      [
        {
          id: 'proxy-1',
          url: 'https://proxy.fr',
        } as any,
      ]
    );

    expect(res).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "https://test.fr",
        ],
        "proxy_url": "https://proxy.fr",
      }
    `);
  });

  it('should work with proxy with headers and certificate authorities', () => {
    const res = generateFleetConfig(
      {
        host_urls: ['https://test.fr'],
        proxy_id: 'proxy-1',
      } as any,
      [
        {
          id: 'proxy-1',
          url: 'https://proxy.fr',
          certificate_authorities: ['/tmp/ssl/ca.crt'],
          proxy_headers: { Authorization: 'xxx' },
        } as any,
      ]
    );

    expect(res).toMatchInlineSnapshot(`
      Object {
        "hosts": Array [
          "https://test.fr",
        ],
        "proxy_headers": Object {
          "Authorization": "xxx",
        },
        "proxy_url": "https://proxy.fr",
        "ssl": Object {
          "certificate_authorities": Array [
            Array [
              "/tmp/ssl/ca.crt",
            ],
          ],
          "renegotiation": "never",
          "verification_mode": "",
        },
      }
    `);
  });
});

it('should work with proxy with headers and certificate authorities and certificate and key', () => {
  const res = generateFleetConfig(
    {
      host_urls: ['https://test.fr'],
      proxy_id: 'proxy-1',
    } as any,
    [
      {
        id: 'proxy-1',
        url: 'https://proxy.fr',
        certificate_authorities: ['/tmp/ssl/ca.crt'],
        proxy_headers: { Authorization: 'xxx' },
        certificate: 'my-cert',
        certificate_key: 'my-key',
      } as any,
    ]
  );

  expect(res).toMatchInlineSnapshot(`
    Object {
      "hosts": Array [
        "https://test.fr",
      ],
      "proxy_headers": Object {
        "Authorization": "xxx",
      },
      "proxy_url": "https://proxy.fr",
      "ssl": Object {
        "certificate": "my-cert",
        "certificate_authorities": Array [
          Array [
            "/tmp/ssl/ca.crt",
          ],
        ],
        "key": "my-key",
        "renegotiation": "never",
        "verification_mode": "",
      },
    }
  `);
});
