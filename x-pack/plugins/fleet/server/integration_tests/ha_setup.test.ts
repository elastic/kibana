/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import { range } from 'lodash';

import type { ISavedObjectsRepository } from '@kbn/core/server';
import * as kbnTestServer from '@kbn/core/test_helpers/kbn_server';

import type {
  AgentPolicySOAttributes,
  Installation,
  OutputSOAttributes,
  PackagePolicySOAttributes,
} from '../types';

import { useDockerRegistry } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

type Root = ReturnType<typeof kbnTestServer.createRoot>;

const startAndWaitForFleetSetup = async (root: Root) => {
  const start = await root.start();

  const isFleetSetupRunning = async () => {
    const statusApi = kbnTestServer.getSupertest(root, 'get', '/api/status');
    const resp = await statusApi.send();
    const fleetStatus = resp.body?.status?.plugins?.fleet;
    if (fleetStatus?.meta?.error) {
      throw new Error(`Setup failed: ${JSON.stringify(fleetStatus)}`);
    }

    return !fleetStatus || fleetStatus?.summary === 'Fleet is setting up';
  };

  while (await isFleetSetupRunning()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return start;
};

const createAndSetupRoot = async (config?: object) => {
  const root = kbnTestServer.createRootWithCorePlugins(
    {
      xpack: {
        fleet: config,
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
            level: 'all',
          },
        ],
      },
    },
    { oss: false }
  );

  await root.preboot();
  await root.setup();
  return root;
};

/**
 * Verifies that multiple Kibana instances running in parallel will not create duplicate preconfiguration objects.
 */
describe('Fleet setup preconfiguration with multiple instances Kibana', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  // let esClient: Client;
  let roots: Root[] = [];

  const registryUrl = useDockerRegistry();

  const startServers = async () => {
    const { startES } = kbnTestServer.createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
      },
    });

    esServer = await startES();
  };

  const addRoots = async (n: number) => {
    const newRoots = await Promise.all(range(n).map(() => createAndSetupRoot(preconfiguration)));
    newRoots.forEach((r) => roots.push(r));
    return newRoots;
  };

  const startRoots = async () => {
    return await Promise.all(roots.map(startAndWaitForFleetSetup));
  };

  const stopServers = async () => {
    for (const root of roots) {
      await root.shutdown();
    }
    roots = [];

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  beforeEach(async () => {
    await startServers();
  });

  afterEach(async () => {
    await stopServers();
  });

  describe('preconfiguration setup', () => {
    it('sets up Fleet correctly with single Kibana instance', async () => {
      await addRoots(1);
      const [root1Start] = await startRoots();
      const soClient = root1Start.savedObjects.createInternalRepository();
      await expectFleetSetupState(soClient);
    });

    it('sets up Fleet correctly when multiple Kibana instances are started at the same time', async () => {
      await addRoots(3);
      const [root1Start] = await startRoots();
      const soClient = root1Start.savedObjects.createInternalRepository();
      await expectFleetSetupState(soClient);
    });

    it('sets up Fleet correctly when multiple Kibana instaces are started in serial', async () => {
      const [root1] = await addRoots(1);
      const root1Start = await startAndWaitForFleetSetup(root1);
      const soClient = root1Start.savedObjects.createInternalRepository();
      await expectFleetSetupState(soClient);

      const [root2] = await addRoots(1);
      await startAndWaitForFleetSetup(root2);
      await expectFleetSetupState(soClient);

      const [root3] = await addRoots(1);
      await startAndWaitForFleetSetup(root3);
      await expectFleetSetupState(soClient);
    });
  });

  const preconfiguration = {
    registryUrl,
    packages: [
      {
        name: 'fleet_server',
        version: 'latest',
      },
      {
        name: 'apm',
        version: 'latest',
      },
    ],
    outputs: [
      {
        name: 'Preconfigured output',
        id: 'preconfigured-output',
        type: 'elasticsearch',
        hosts: ['http://127.0.0.1:9200'],
      },
    ],
    agentPolicies: [
      {
        name: 'managed-test',
        id: 'managed-policy-test',
        data_output_id: 'preconfigured-output',
        monitoring_output_id: 'preconfigured-output',
        is_managed: true,
        is_default_fleet_server: true,
        package_policies: [
          {
            name: 'fleet-server-123',
            package: {
              name: 'fleet_server',
            },
            inputs: [
              {
                type: 'fleet-server',
                keep_enabled: true,
                vars: [{ name: 'host', value: '127.0.0.1:8220', frozen: true }],
              },
            ],
          },
        ],
      },
      {
        name: 'nonmanaged-test',
        id: 'nonmanaged-policy-test',
        is_managed: false,
        package_policies: [
          {
            name: 'apm-123',
            package: {
              name: 'apm',
            },
            inputs: [
              {
                type: 'apm',
                keep_enabled: true,
                vars: [
                  { name: 'api_key_enabled', value: true },
                  { name: 'host', value: '0.0.0.0:8200', frozen: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  async function expectFleetSetupState(soClient: ISavedObjectsRepository) {
    // Assert setup state
    const agentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: 'ingest-agent-policies',
      perPage: 10000,
    });
    expect(agentPolicies.saved_objects).toHaveLength(2);
    expect(agentPolicies.saved_objects.map((ap) => ap.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'managed-test',
          is_managed: true,
          is_default_fleet_server: true,
          data_output_id: 'preconfigured-output',
        }),
        expect.objectContaining({
          name: 'nonmanaged-test',
          is_managed: false,
        }),
      ])
    );

    const packagePolicies = await soClient.find<PackagePolicySOAttributes>({
      type: 'ingest-package-policies',
      perPage: 10000,
    });
    expect(packagePolicies.saved_objects).toHaveLength(2);
    expect(packagePolicies.saved_objects.map((pp) => pp.attributes.name)).toEqual(
      expect.arrayContaining(['apm-123', 'fleet-server-123'])
    );

    const outputs = await soClient.find<OutputSOAttributes>({
      type: 'ingest-outputs',
      perPage: 10000,
    });
    expect(outputs.saved_objects).toHaveLength(2);
    expect(outputs.saved_objects.map((o) => o.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'default',
          is_default: true,
          is_default_monitoring: true,
          type: 'elasticsearch',
          output_id: 'fleet-default-output',
          hosts: ['http://localhost:9200'],
        }),
        expect.objectContaining({
          name: 'Preconfigured output',
          is_default: false,
          is_default_monitoring: false,
          type: 'elasticsearch',
          output_id: 'preconfigured-output',
          hosts: ['http://127.0.0.1:9200'],
        }),
      ])
    );

    const packages = await soClient.find<Installation>({
      type: 'epm-packages',
      perPage: 10000,
    });
    expect(packages.saved_objects).toHaveLength(2);
    expect(packages.saved_objects.map((p) => p.attributes.name)).toEqual(
      expect.arrayContaining(['fleet_server', 'apm'])
    );
  }
});
