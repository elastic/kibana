/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import omit from 'lodash/omit';

import type { AgentPolicy, Output, DownloadSource, PackageInfo } from '../../types';
import { createAppContextStartContractMock } from '../../mocks';

import { agentPolicyService } from '../agent_policy';
import { agentPolicyUpdateEventHandler } from '../agent_policy_update';
import { appContextService } from '../app_context';
import { getPackageInfo } from '../epm/packages';

import {
  generateFleetConfig,
  getFullAgentPolicy,
  transformOutputToFullPolicyOutput,
} from './full_agent_policy';
import { getMonitoringPermissions } from './monitoring_permissions';

jest.mock('../epm/packages');

const mockedGetElasticAgentMonitoringPermissions = getMonitoringPermissions as jest.Mock<
  ReturnType<typeof getMonitoringPermissions>
>;
const mockedAgentPolicyService = agentPolicyService as jest.Mocked<typeof agentPolicyService>;

const soClientMock = savedObjectsClientMock.create();
const mockedGetPackageInfo = getPackageInfo as jest.Mock<ReturnType<typeof getPackageInfo>>;

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
    is_protected: false,
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
    'test-remote-id': {
      id: 'test-remote-id',
      is_default: true,
      is_default_monitoring: true,
      name: 'default',
      // @ts-ignore
      type: 'remote_elasticsearch',
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
          traces: false,
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
          traces: false,
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
          traces: false,
        },
      },
    });
  });

  it('should return a policy with monitoring if monitoring is enabled for traces', async () => {
    mockAgentPolicy({
      namespace: 'default',
      revision: 1,
      monitoring_enabled: ['traces'],
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
          metrics: false,
          traces: true,
        },
      },
    });
  });

  it('should return a policy with monitoring enabled but no logs/metrics/traces if keep_monitoring_alive is true', async () => {
    mockAgentPolicy({
      keep_monitoring_alive: true,
    });

    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy?.agent?.monitoring).toEqual({
      enabled: true,
      logs: false,
      metrics: false,
      traces: false,
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
        traces: false,
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

  it('should use output id as the default policy id when remote elasticsearch', async () => {
    mockAgentPolicy({
      id: 'policy',
      status: 'active',
      package_policies: [],
      is_managed: false,
      namespace: 'default',
      revision: 1,
      data_output_id: 'test-remote-id',
      monitoring_output_id: 'test-remote-id',
    });

    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy?.outputs['test-remote-id']).toBeDefined();
  });

  it('should return the right outputs and permissions when package policies use their own outputs', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      data_streams: [
        {
          type: 'logs',
          dataset: 'elastic_agent.metricbeat',
        },
        {
          type: 'metrics',
          dataset: 'elastic_agent.metricbeat',
        },
        {
          type: 'logs',
          dataset: 'elastic_agent.filebeat',
        },
        {
          type: 'metrics',
          dataset: 'elastic_agent.filebeat',
        },
      ],
    } as PackageInfo);
    mockAgentPolicy({
      id: 'integration-output-policy',
      status: 'active',
      package_policies: [
        {
          id: 'package-policy-using-output',
          name: 'test-policy-1',
          namespace: 'policyspace',
          enabled: true,
          package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
          output_id: 'test-remote-id',
          inputs: [
            {
              type: 'test-logs',
              enabled: true,
              streams: [
                {
                  id: 'test-logs',
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'some-logs' },
                },
              ],
            },
            {
              type: 'test-metrics',
              enabled: false,
              streams: [
                {
                  id: 'test-logs',
                  enabled: false,
                  data_stream: { type: 'metrics', dataset: 'some-metrics' },
                },
              ],
            },
          ],
          created_at: '',
          updated_at: '',
          created_by: '',
          updated_by: '',
          revision: 1,
          policy_id: '',
          policy_ids: [''],
        },
        {
          id: 'package-policy-no-output',
          name: 'test-policy-2',
          namespace: '',
          enabled: true,
          package: { name: 'system', version: '1.0.0', title: 'System' },
          inputs: [
            {
              type: 'test-logs',
              enabled: true,
              streams: [
                {
                  id: 'test-logs',
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'some-logs' },
                },
              ],
            },
            {
              type: 'test-metrics',
              enabled: false,
              streams: [
                {
                  id: 'test-logs',
                  enabled: false,
                  data_stream: { type: 'metrics', dataset: 'some-metrics' },
                },
              ],
            },
          ],
          created_at: '',
          updated_at: '',
          created_by: '',
          updated_by: '',
          revision: 1,
          policy_id: '',
          policy_ids: [''],
        },
      ],
      is_managed: false,
      namespace: 'defaultspace',
      revision: 1,
      name: 'Policy',
      updated_at: '2020-01-01',
      updated_by: 'qwerty',
      is_protected: false,
      data_output_id: 'data-output-id',
    });

    const agentPolicy = await getFullAgentPolicy(
      savedObjectsClientMock.create(),
      'integration-output-policy'
    );
    expect(agentPolicy).toMatchSnapshot();
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
          traces: false,
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
          traces: false,
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
    appContextService.start(createAppContextStartContractMock());

    mockAgentPolicy({});
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy!.agent!.protection).toMatchObject({
      enabled: false,
      uninstall_token_hash: '',
      signing_key: 'thisisapublickey',
    });
    expect(agentPolicy!.signed).toMatchObject({
      data: 'eyJpZCI6ImFnZW50LXBvbGljeSIsImFnZW50Ijp7ImZlYXR1cmVzIjp7fSwicHJvdGVjdGlvbiI6eyJlbmFibGVkIjpmYWxzZSwidW5pbnN0YWxsX3Rva2VuX2hhc2giOiIiLCJzaWduaW5nX2tleSI6InRoaXNpc2FwdWJsaWNrZXkifX0sImlucHV0cyI6W119',
      signature: 'thisisasignature',
    });
  });

  it('should compile full policy with correct namespaces', async () => {
    mockedGetPackageInfo.mockResolvedValue({
      data_streams: [
        {
          type: 'logs',
          dataset: 'elastic_agent.metricbeat',
        },
        {
          type: 'metrics',
          dataset: 'elastic_agent.metricbeat',
        },
        {
          type: 'logs',
          dataset: 'elastic_agent.filebeat',
        },
        {
          type: 'metrics',
          dataset: 'elastic_agent.filebeat',
        },
      ],
    } as PackageInfo);
    mockAgentPolicy({
      id: 'agent-policy',
      status: 'active',
      package_policies: [
        {
          id: 'package-policy-uuid-test-123',
          name: 'test-policy-1',
          namespace: 'policyspace',
          enabled: true,
          package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
          inputs: [
            {
              type: 'test-logs',
              enabled: true,
              streams: [
                {
                  id: 'test-logs',
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'some-logs' },
                },
              ],
            },
            {
              type: 'test-metrics',
              enabled: false,
              streams: [
                {
                  id: 'test-logs',
                  enabled: false,
                  data_stream: { type: 'metrics', dataset: 'some-metrics' },
                },
              ],
            },
          ],
          created_at: '',
          updated_at: '',
          created_by: '',
          updated_by: '',
          revision: 1,
          policy_id: '',
          policy_ids: [''],
        },
        {
          id: 'package-policy-uuid-test-123',
          name: 'test-policy-2',
          namespace: '',
          enabled: true,
          package: { name: 'test_package', version: '0.0.0', title: 'Test Package' },
          inputs: [
            {
              type: 'test-logs',
              enabled: true,
              streams: [
                {
                  id: 'test-logs',
                  enabled: true,
                  data_stream: { type: 'logs', dataset: 'some-logs' },
                },
              ],
            },
            {
              type: 'test-metrics',
              enabled: false,
              streams: [
                {
                  id: 'test-logs',
                  enabled: false,
                  data_stream: { type: 'metrics', dataset: 'some-metrics' },
                },
              ],
            },
          ],
          created_at: '',
          updated_at: '',
          created_by: '',
          updated_by: '',
          revision: 1,
          policy_id: '',
          policy_ids: [''],
        },
      ],
      is_managed: false,
      namespace: 'defaultspace',
      revision: 1,
      name: 'Policy',
      updated_at: '2020-01-01',
      updated_by: 'qwerty',
      is_protected: false,
    });

    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(omit(agentPolicy, 'signed', 'secret_references', 'agent.protection')).toEqual({
      agent: {
        download: {
          sourceURI: 'http://default-registry.co',
        },
        features: {},
        monitoring: {
          enabled: false,
          logs: false,
          metrics: false,
          traces: false,
        },
      },
      fleet: {
        hosts: ['http://fleetserver:8220'],
      },
      id: 'agent-policy',
      inputs: [
        {
          data_stream: {
            namespace: 'policyspace',
          },
          id: 'test-logs-package-policy-uuid-test-123',
          meta: {
            package: {
              name: 'test_package',
              version: '0.0.0',
            },
          },
          name: 'test-policy-1',
          package_policy_id: 'package-policy-uuid-test-123',
          revision: 1,
          streams: [
            {
              data_stream: {
                dataset: 'some-logs',
                type: 'logs',
              },
              id: 'test-logs',
            },
          ],
          type: 'test-logs',
          use_output: 'default',
        },
        {
          data_stream: {
            namespace: 'defaultspace',
          },
          id: 'test-logs-package-policy-uuid-test-123',
          meta: {
            package: {
              name: 'test_package',
              version: '0.0.0',
            },
          },
          name: 'test-policy-2',
          package_policy_id: 'package-policy-uuid-test-123',
          revision: 1,
          streams: [
            {
              data_stream: {
                dataset: 'some-logs',
                type: 'logs',
              },
              id: 'test-logs',
            },
          ],
          type: 'test-logs',
          use_output: 'default',
        },
      ],
      output_permissions: {
        default: {
          _elastic_agent_checks: {
            cluster: ['monitor'],
          },
          _elastic_agent_monitoring: {
            indices: [
              {
                names: [],
                privileges: [],
              },
            ],
          },
          'package-policy-uuid-test-123': {
            indices: [
              {
                names: ['logs-some-logs-defaultspace'],
                privileges: ['auto_configure', 'create_doc'],
              },
            ],
          },
        },
      },
      outputs: {
        default: {
          hosts: ['http://127.0.0.1:9201'],
          preset: 'balanced',
          type: 'elasticsearch',
        },
      },
      revision: 1,
    });
  });

  it('should return a policy with advanced settings', async () => {
    mockAgentPolicy({
      advanced_settings: {
        agent_limits_go_max_procs: 2,
        agent_logging_level: 'debug',
      },
    });
    const agentPolicy = await getFullAgentPolicy(savedObjectsClientMock.create(), 'agent-policy');

    expect(agentPolicy).toMatchObject({
      id: 'agent-policy',
      agent: {
        limits: { go_max_procs: 2 },
        logging: { level: 'debug' },
      },
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
        "preset": "balanced",
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
        "preset": "balanced",
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
        "preset": "balanced",
        "proxy_url": "https://proxy1.fr",
        "type": "elasticsearch",
      }
    `);
  });

  it('should return placeholder API_KEY for elasticsearch output type in standalone ', () => {
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
        "api_key": "\${API_KEY}",
        "hosts": Array [
          "http://host.fr",
        ],
        "preset": "balanced",
        "type": "elasticsearch",
      }
    `);
  });

  it('should not return placeholder API_KEY for logstash output type in standalone ', () => {
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

  it('should work with kafka output', () => {
    const policyOutput = transformOutputToFullPolicyOutput({
      id: 'id123',
      hosts: ['test:9999'],
      topics: [
        {
          topic: 'test',
        },
        // Deprecated conditionnal topic
        {
          topic: 'deprecated',
          when: { condition: 'test:100', type: 'equals' },
        },
      ],
      is_default: false,
      is_default_monitoring: false,
      name: 'test output',
      type: 'kafka',
      config_yaml: '',
      client_id: 'Elastic',
      version: '1.0.0',
      compression: 'none',
      auth_type: 'none',
      connection_type: 'plaintext',
      partition: 'random',
      random: {
        group_events: 1,
      },
      headers: [
        {
          key: '',
          value: '',
        },
      ],
      timeout: 30,
      broker_timeout: 30,
      required_acks: 1,
    });

    expect(policyOutput).toMatchInlineSnapshot(`
      Object {
        "broker_timeout": 30,
        "client_id": "Elastic",
        "compression": "none",
        "headers": Array [],
        "hosts": Array [
          "test:9999",
        ],
        "key": undefined,
        "partition": Object {
          "random": Object {
            "group_events": 1,
          },
        },
        "required_acks": 1,
        "timeout": 30,
        "topic": "test",
        "type": "kafka",
        "version": "1.0.0",
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
