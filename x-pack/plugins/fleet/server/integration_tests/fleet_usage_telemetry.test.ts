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
        },
      ],
      refresh: 'wait_for',
    });

    await esClient.create({
      index: '.fleet-policies',
      id: 'policy1-rv2',
      body: {
        revision_idx: 2,
        policy_id: 'fleet-server-policy',
        data: {
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
      index: '.fleet-policies',
      id: 'policy1-rv1',
      body: {
        revision_idx: 1,
        policy_id: 'fleet-server-policy',
        data: {
          outputs: {
            default: {
              type: 'logstash', // this should not show up in telemetry as it is from a past revision
            },
          },
        },
      },
      refresh: 'wait_for',
    });

    await esClient.create({
      index: 'logs-elastic_agent-default',
      id: 'log1',
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
          total_enrolled: 2,
          healthy: 0,
          unhealthy: 0,
          inactive: 0,
          unenrolled: 1,
          offline: 2,
          total_all_statuses: 3,
          updating: 0,
        },
        fleet_server: {
          total_all_statuses: 0,
          total_enrolled: 0,
          healthy: 0,
          unhealthy: 0,
          offline: 0,
          updating: 0,
          num_host_urls: 0,
        },
        packages: [],
        agents_per_version: [
          { version: '8.5.1', count: 1 },
          { version: '8.6.0', count: 1 },
        ],
        agent_checkin_status: { error: 1, degraded: 1 },
        agents_per_policy: [2],
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
        // there are 2 agent policies test-456789 and fleet-server-policy
        agent_policies: { count: 2, output_types: ['elasticsearch'] },
        // agent_logs_top_errors: ['stderr panic close of closed channel'],
        // fleet_server_logs_top_errors: ['failed to unenroll offline agents'],
      })
    );
  });

  it('should fetch agent policies usage telemetry if .fleet-policies index does not exist', async () => {
    const esClient = kbnServer.coreStart.elasticsearch.client.asInternalUser;
    const res = await esClient.indices.resolveIndex({ name: '.fleet-policies' });
    for (const index of res.aliases) {
      await esClient.indices.delete({ index: index.indices! });
    }

    const usage = await fetchFleetUsage(core, { agents: { enabled: true } }, new AbortController());

    expect(usage?.agent_policies).toEqual({ count: 0, output_types: [] });
  });
});
