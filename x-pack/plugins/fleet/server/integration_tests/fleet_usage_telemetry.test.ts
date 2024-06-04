/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

import { fetchFleetUsage } from '../collectors/register';

import { waitForFleetSetup } from './helpers';

const logFilePath = path.join(__dirname, 'logs.log');

describe('fleet usage telemetry', () => {
  let core: any;
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;
  const registryUrl = 'http://localhost';

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {},
      },
    });

    esServer = await startES();
    const startKibana = async () => {
      const root = createRootWithCorePlugins(
        {
          xpack: {
            fleet: {
              registryUrl,
              agentPolicies: [
                {
                  name: 'Second preconfigured policy',
                  description: 'second policy',
                  is_default: false,
                  is_managed: true,
                  id: 'test-456789',
                  namespace: 'default',
                  monitoring_enabled: [],
                  package_policies: [],
                },
              ],
            },
          },
          logging: {
            appenders: {
              file: {
                type: 'file',
                fileName: logFilePath,
                layout: {
                  type: 'json',
                },
              },
            },
            loggers: [
              {
                name: 'root',
                appenders: ['file'],
              },
              {
                name: 'plugins.fleet',
                level: 'info',
              },
            ],
          },
        },
        { oss: false }
      );

      await root.preboot();
      const coreSetup = await root.setup();
      const coreStart = await root.start();

      return {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
    };
    kbnServer = await startKibana();
    await waitForFleetSetup(kbnServer.root);
  };

  const stopServers = async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  beforeAll(async () => {
    await startServers();

    const esClient = kbnServer.coreStart.elasticsearch.client.asInternalUser;
    await esClient.bulk({
      index: '.fleet-agents',
      body: [
        {
          create: {
            _id: 'agent1',
          },
        },
        {
          agent: {
            version: '8.6.0',
          },
          last_checkin_status: 'error',
          last_checkin: '2022-11-21T12:26:24Z',
          active: true,
          policy_id: 'policy1',
          local_metadata: {
            os: {
              name: 'Ubuntu',
              version: '22.04.2 LTS (Jammy Jellyfish)',
            },
            elastic: { agent: { unprivileged: false } }, // Root agent
          },
          components: [
            {
              id: 'filestream-monitoring',
              status: 'UNHEALTHY',
            },
            {
              id: 'beat/metrics-monitoring',
              status: 'HEALTHY',
            },
          ],
          upgrade_details: {
            target_version: '8.12.0',
            state: 'UPG_FAILED',
            metadata: {
              error_msg: 'Download failed',
            },
          },
        },
        {
          create: {
            _id: 'agent2',
          },
        },
        {
          agent: {
            version: '8.5.1',
          },
          last_checkin_status: 'degraded',
          last_checkin: '2022-11-21T12:27:24Z',
          active: true,
          policy_id: 'policy1',
          local_metadata: {
            os: {
              name: 'Ubuntu',
              version: '20.04.5 LTS (Focal Fossa)',
            },
            elastic: { agent: { unprivileged: true } }, // Non root agent
          },
          components: [
            {
              id: 'filestream-monitoring',
              status: 'HEALTHY',
            },
            {
              id: 'beat/metrics-monitoring',
              status: 'HEALTHY',
            },
          ],
          upgrade_details: {
            target_version: '8.12.0',
            state: 'UPG_FAILED',
            metadata: {
              error_msg: 'Agent crash detected',
            },
          },
        },
        {
          create: {
            _id: 'unenrolled',
          },
        },
        {
          agent: {
            version: '8.5.1',
          },
          last_checkin_status: 'online',
          last_checkin: '2021-11-21T12:27:24Z',
          active: false,
          policy_id: 'policy1',
          local_metadata: {
            os: {
              name: 'Ubuntu',
              version: '20.04.5 LTS (Focal Fossa)',
            },
          },
          components: [
            {
              id: 'filestream-monitoring',
              status: 'HEALTHY',
            },
            {
              id: 'beat/metrics-monitoring',
              status: 'HEALTHY',
            },
          ],
        },
        {
          create: {
            _id: 'agent3',
          },
        },
        {
          agent: {
            version: '8.6.0',
          },
          last_checkin_status: 'online',
          last_checkin: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          active: true,
          policy_id: 'policy2',
          upgrade_details: {
            target_version: '8.11.0',
            state: 'UPG_ROLLBACK',
            metadata: {},
          },
        },
        {
          create: {
            _id: 'agent4',
          },
        },
        {
          agent: {
            version: '8.6.0',
          },
          last_checkin_status: 'online',
          last_checkin: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
          active: true,
          policy_id: 'policy3',
        },
      ],
      refresh: 'wait_for',
    });

    await esClient.create({
      index: '.fleet-policies',
      id: 'policy1',
      body: {
        data: {
          id: 'fleet-server-policy',
          outputs: {
            default: {
              type: 'elasticsearch',
            },
          },
        },
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent-default',
      id: 'panic1',
      body: {
        log: {
          level: 'error',
        },
        '@timestamp': new Date().toISOString(),
        message: 'stderr panic close of closed channel',
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent-default',
      id: 'panic2',
      body: {
        log: {
          level: 'error',
        },
        '@timestamp': new Date(Date.now() - 1000 * 60).toISOString(),
        message: 'stderr panic some other panic',
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent-default',
      id: 'not-panic',
      body: {
        log: {
          level: 'error',
        },
        '@timestamp': new Date().toISOString(),
        message: 'this should not be included in metrics',
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent-default',
      id: 'panic-outside-time-range',
      body: {
        log: {
          level: 'error',
        },
        '@timestamp': new Date(Date.now() - 2000 * 60 * 60).toISOString(),
        message: 'stderr panic this should not be included in metrics',
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent.fleet_server-default',
      id: 'log2',
      body: {
        log: {
          level: 'error',
        },
        '@timestamp': new Date().toISOString(),
        message: 'failed to unenroll offline agents',
      },
      refresh: 'wait_for',
    });

    const soClient = kbnServer.coreStart.savedObjects.createInternalRepository();
    await soClient.create('ingest-package-policies', {
      name: 'fleet_server-1',
      namespace: 'default',
      package: {
        name: 'fleet_server',
        title: 'Fleet Server',
        version: '1.2.0',
      },
      enabled: true,
      policy_id: 'fleet-server-policy',
      policy_ids: ['fleet-server-policy'],
      inputs: [
        {
          compiled_input: {
            server: {
              port: 8220,
              host: '0.0.0.0',
              'limits.max_agents': 3000,
              other: 'other',
            },
            'server.runtime': 'gc_percent:20',
            ssl: 'ssl',
          },
        },
      ],
    });

    await soClient.create(
      'ingest-outputs',
      {
        name: 'output2',
        type: 'third_type',
        hosts: ['http://localhost:9300'],
        is_default: false,
        is_default_monitoring: false,
        config_yaml: '',
        ca_trusted_fingerprint: '',
        proxy_id: null,
      },
      { id: 'output2' }
    );
    await soClient.create(
      'ingest-outputs',
      {
        name: 'output3',
        type: 'logstash',
        hosts: ['http://localhost:9400'],
        is_default: false,
        is_default_monitoring: false,
        config_yaml: '',
        ca_trusted_fingerprint: '',
        proxy_id: null,
      },
      { id: 'output3' }
    );
    await soClient.create(
      'ingest-outputs',
      {
        name: 'output4',
        type: 'elasticsearch',
        hosts: ['http://localhost:9200'],
        is_default: false,
        is_default_monitoring: false,
        config_yaml: '',
        ca_trusted_fingerprint: '',
        proxy_id: null,
        preset: 'balanced',
      },
      { id: 'output4' }
    );

    await soClient.create(
      'ingest-agent-policies',
      {
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        name: 'Another policy',
        description: 'Policy 2',
        inactivity_timeout: 1209600,
        status: 'active',
        is_managed: false,
        revision: 2,
        updated_by: 'system',
        schema_version: '1.0.0',
        data_output_id: 'output2',
        monitoring_output_id: 'output3',
      },
      { id: 'policy2' }
    );
    await soClient.create(
      'ingest-agent-policies',
      {
        namespace: 'default',
        monitoring_enabled: ['logs', 'metrics'],
        name: 'Yet another policy',
        description: 'Policy 3',
        inactivity_timeout: 1209600,
        status: 'active',
        is_managed: false,
        revision: 2,
        updated_by: 'system',
        schema_version: '1.0.0',
        data_output_id: 'output4',
        monitoring_output_id: 'output4',
      },
      { id: 'policy3' }
    );
  });

  afterAll(async () => {
    await stopServers();
  });

  beforeEach(() => {
    core = { getStartServices: jest.fn().mockResolvedValue([kbnServer.coreStart]) };
  });

  it('should fetch usage telemetry', async () => {
    const usage = await fetchFleetUsage(core, { agents: { enabled: true } }, new AbortController());

    expect(usage).toEqual(
      expect.objectContaining({
        agents_enabled: true,
        agents: {
          total_enrolled: 4,
          healthy: 0,
          unhealthy: 0,
          inactive: 0,
          unenrolled: 1,
          offline: 4,
          total_all_statuses: 5,
          updating: 0,
        },
        fleet_server: {
          total_all_statuses: 0,
          total_enrolled: 0,
          healthy: 0,
          unhealthy: 0,
          offline: 0,
          updating: 0,
          inactive: 0,
          unenrolled: 0,
          num_host_urls: 0,
        },
        packages: [],
        agents_per_privileges: {
          root: 3,
          unprivileged: 1,
        },
        agents_per_version: [
          {
            version: '8.6.0',
            count: 3,
            healthy: 0,
            inactive: 0,
            offline: 3,
            unenrolled: 0,
            unhealthy: 0,
            updating: 0,
          },
          {
            version: '8.5.1',
            count: 1,
            healthy: 0,
            inactive: 0,
            offline: 1,
            unenrolled: 1,
            unhealthy: 0,
            updating: 0,
          },
        ],
        agent_checkin_status: { error: 1, degraded: 1 },
        agents_per_policy: [2, 1, 1],
        agents_per_os: [
          {
            name: 'Ubuntu',
            version: '20.04.5 LTS (Focal Fossa)',
            count: 1,
          },
          {
            name: 'Ubuntu',
            version: '22.04.2 LTS (Jammy Jellyfish)',
            count: 1,
          },
        ],
        agents_per_output_type: [
          {
            count_as_data: 1,
            count_as_monitoring: 0,
            output_type: 'third_type',
          },
          {
            count_as_data: 0,
            count_as_monitoring: 1,
            output_type: 'logstash',
          },
          {
            count_as_data: 1,
            count_as_monitoring: 1,
            output_type: 'elasticsearch',
            preset_counts: {
              balanced: 2,
              custom: 0,
              latency: 0,
              scale: 0,
              throughput: 0,
            },
          },
        ],
        fleet_server_config: {
          policies: [
            {
              input_config: {
                server: {
                  'limits.max_agents': 3000,
                },
                'server.runtime': 'gc_percent:20',
              },
            },
          ],
        },
        agent_policies: {
          count: 3,
          output_types: expect.arrayContaining(['elasticsearch', 'logstash', 'third_type']),
        },
        agent_logs_panics_last_hour: [
          {
            timestamp: expect.any(String),
            message: 'stderr panic close of closed channel',
          },
          {
            timestamp: expect.any(String),
            message: 'stderr panic some other panic',
          },
        ],
        agent_logs_top_errors: [
          'stderr panic some other panic',
          'stderr panic close of closed channel',
          'this should not be included in metrics',
        ],
        fleet_server_logs_top_errors: ['failed to unenroll offline agents'],
      })
    );
    expect(usage?.upgrade_details.length).toBe(3);
    expect(usage?.upgrade_details).toContainEqual({
      target_version: '8.12.0',
      state: 'UPG_FAILED',
      error_msg: 'Download failed',
      agent_count: 1,
    });
    expect(usage?.upgrade_details).toContainEqual({
      target_version: '8.12.0',
      state: 'UPG_FAILED',
      error_msg: 'Agent crash detected',
      agent_count: 1,
    });
    expect(usage?.upgrade_details).toContainEqual({
      target_version: '8.11.0',
      state: 'UPG_ROLLBACK',
      error_msg: '',
      agent_count: 1,
    });
  });
});
