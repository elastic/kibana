/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

import { AGENT_POLICY_INDEX } from '../../common';
import type { PackagePolicySOAttributes } from '../../common';
import type { AgentPolicySOAttributes } from '../types';

import { useDockerRegistry, waitForFleetSetup } from './helpers';
import { CLOUD_KIBANA_CONFIG } from './fixtures/cloud_kibana_config';

const logFilePath = Path.join(__dirname, 'logs.log');

// FLAKY: https://github.com/elastic/kibana/issues/127076
describe.skip('Fleet preconfiguration reset', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let kbnServer: kbnTestServer.TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async () => {
    const { startES } = kbnTestServer.createTestServers({
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
      const root = kbnTestServer.createRootWithCorePlugins(
        {
          xpack: {
            ...CLOUD_KIBANA_CONFIG.xpack,
            fleet: {
              ...CLOUD_KIBANA_CONFIG.xpack.fleet,
              registryUrl,
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
                level: 'all',
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

  // Share the same servers for all the test to make test a lot faster (but test are not isolated anymore)
  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  // FLAKY: https://github.com/elastic/kibana/issues/127077
  describe.skip('Preconfigred cloud policy', () => {
    it('Works and preconfigure correctly agent policies', async () => {
      const agentPolicies = await kbnServer.coreStart.savedObjects
        .createInternalRepository()
        .find<AgentPolicySOAttributes>({
          type: 'ingest-agent-policies',
          perPage: 10000,
        });

      expect(agentPolicies.total).toBe(2);
      expect(
        agentPolicies.saved_objects.find((so) => so.id === 'policy-elastic-agent-on-cloud')
      ).toBeDefined();
      expect(agentPolicies.saved_objects.find((so) => so.id === 'default-policy')).toBeDefined();
    });

    it('Create correct .fleet-policies', async () => {
      const res = await kbnServer.coreStart.elasticsearch.client.asInternalUser.search({
        index: AGENT_POLICY_INDEX,
        q: `policy_id:policy-elastic-agent-on-cloud`,
        sort: 'revision_idx:desc',
      });

      expect((res.hits.hits[0]._source as any)!.data).toMatchSnapshot();
    });

    it('Create correct package policies', async () => {
      const packagePolicies = await kbnServer.coreStart.savedObjects
        .createInternalRepository()
        .find<PackagePolicySOAttributes>({
          type: 'ingest-package-policies',
          perPage: 10000,
        });

      expect(packagePolicies.total).toBe(3);
      expect(
        packagePolicies.saved_objects.find((so) => so.id === 'elastic-cloud-fleet-server')
      ).toBeDefined();
      expect(
        packagePolicies.saved_objects.find((so) => so.id === 'elastic-cloud-apm')
      ).toBeDefined();
      expect(packagePolicies.saved_objects.find((so) => so.id === 'default-system')).toBeDefined();

      const fleetServerPackagePolicy = packagePolicies.saved_objects.find(
        (so) => so.id === 'elastic-cloud-fleet-server'
      );
      expect(fleetServerPackagePolicy?.attributes.vars).toMatchInlineSnapshot(`undefined`);
      expect(fleetServerPackagePolicy?.attributes.inputs).toMatchInlineSnapshot(`
        Array [
          Object {
            "compiled_input": Object {
              "server": Object {
                "host": "0.0.0.0",
                "port": 8220,
              },
              "server.runtime": Object {
                "gc_percent": 20,
              },
            },
            "enabled": true,
            "keep_enabled": true,
            "policy_template": "fleet_server",
            "streams": Array [],
            "type": "fleet-server",
            "vars": Object {
              "custom": Object {
                "type": "yaml",
                "value": "server.runtime:
          gc_percent: 20          # Force the GC to execute more frequently: see https://golang.org/pkg/runtime/debug/#SetGCPercent
        ",
              },
              "host": Object {
                "frozen": true,
                "type": "text",
                "value": "0.0.0.0",
              },
              "max_connections": Object {
                "type": "integer",
              },
              "port": Object {
                "frozen": true,
                "type": "integer",
                "value": 8220,
              },
            },
          },
        ]
      `);
    });
  });
});
