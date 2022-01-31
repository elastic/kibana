/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import { adminTestUser } from '@kbn/test';

import * as kbnTestServer from 'src/core/test_helpers/kbn_server';
import type { HttpMethod } from 'src/core/test_helpers/kbn_server';

import type { AgentPolicySOAttributes } from '../types';

const logFilePath = Path.join(__dirname, 'logs.log');

type Root = ReturnType<typeof kbnTestServer.createRoot>;

function getSupertestWithAdminUser(root: Root, method: HttpMethod, path: string) {
  const testUserCredentials = Buffer.from(`${adminTestUser.username}:${adminTestUser.password}`);
  return kbnTestServer
    .getSupertest(root, method, path)
    .set('Authorization', `Basic ${testUserCredentials.toString('base64')}`);
}

const waitForFleetSetup = async (root: Root) => {
  const isFleetSetupRunning = async () => {
    const statusApi = getSupertestWithAdminUser(root, 'get', '/api/status');
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
};

describe('Fleet preconfiguration rest', () => {
  let esServer: kbnTestServer.TestElasticsearchUtils;
  let kbnServer: kbnTestServer.TestKibanaUtils;

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
            fleet: {
              // Preconfigure two policies test-12345 and test-456789
              agentPolicies: [
                {
                  name: 'Elastic Cloud agent policy 0001',
                  description: 'Default agent policy for agents hosted on Elastic Cloud',
                  is_default: false,
                  is_managed: true,
                  id: 'test-12345',
                  namespace: 'default',
                  monitoring_enabled: [],
                  package_policies: [
                    {
                      name: 'fleet_server123456789',
                      package: {
                        name: 'fleet_server',
                      },
                      inputs: [
                        {
                          type: 'fleet-server',
                          keep_enabled: true,
                          vars: [
                            {
                              name: 'host',
                              value: '127.0.0.1',
                              frozen: true,
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  name: 'Second preconfigured policy',
                  description: 'second policy',
                  is_default: false,
                  is_managed: true,
                  id: 'test-456789',
                  namespace: 'default',
                  monitoring_enabled: [],
                  package_policies: [
                    {
                      name: 'fleet_server987654321',
                      package: {
                        name: 'fleet_server',
                      },
                      inputs: [
                        {
                          type: 'fleet-server',
                          keep_enabled: true,
                          vars: [
                            {
                              name: 'host',
                              value: '127.0.0.1',
                              frozen: true,
                            },
                          ],
                        },
                      ],
                    },
                  ],
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

  describe('Reset all policy', () => {
    it('Works and reset all preconfigured policies', async () => {
      const resetAPI = getSupertestWithAdminUser(
        kbnServer.root,
        'post',
        '/internal/fleet/reset_preconfigured_agent_policies'
      );
      await resetAPI.set('kbn-sxrf', 'xx').expect(200).send();

      const agentPolicies = await kbnServer.coreStart.savedObjects
        .createInternalRepository()
        .find<AgentPolicySOAttributes>({
          type: 'ingest-agent-policies',
          perPage: 10000,
        });
      expect(agentPolicies.saved_objects).toHaveLength(2);
      expect(agentPolicies.saved_objects.map((ap) => ap.attributes)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Elastic Cloud agent policy 0001',
          }),
          expect.objectContaining({
            name: 'Second preconfigured policy',
          }),
        ])
      );
    });
  });

  describe('Reset one preconfigured policy', () => {
    const POLICY_ID = 'test-12345';

    it('Works and reset one preconfigured policies if the policy is already deleted (with a ghost package policy)', async () => {
      const soClient = kbnServer.coreStart.savedObjects.createInternalRepository();

      await soClient.delete('ingest-agent-policies', POLICY_ID);

      const oldAgentPolicies = await soClient.find<AgentPolicySOAttributes>({
        type: 'ingest-agent-policies',
        perPage: 10000,
      });

      const secondAgentPoliciesUpdatedAt = oldAgentPolicies.saved_objects[0].updated_at;

      const resetAPI = getSupertestWithAdminUser(
        kbnServer.root,
        'post',
        '/internal/fleet/reset_preconfigured_agent_policies/test-12345'
      );
      await resetAPI.set('kbn-sxrf', 'xx').expect(200).send();

      const agentPolicies = await kbnServer.coreStart.savedObjects
        .createInternalRepository()
        .find<AgentPolicySOAttributes>({
          type: 'ingest-agent-policies',
          perPage: 10000,
        });
      expect(agentPolicies.saved_objects).toHaveLength(2);
      expect(
        agentPolicies.saved_objects.map((ap) => ({ ...ap.attributes, updated_at: ap.updated_at }))
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Elastic Cloud agent policy 0001',
          }),
          expect.objectContaining({
            name: 'Second preconfigured policy',
            updated_at: secondAgentPoliciesUpdatedAt, // Check that policy was not updated
          }),
        ])
      );
    });

    it('Works if the preconfigured policies already exists with a missing package policy', async () => {
      const soClient = kbnServer.coreStart.savedObjects.createInternalRepository();

      await soClient.update('ingest-agent-policies', POLICY_ID, {
        package_policies: [],
      });

      const resetAPI = getSupertestWithAdminUser(
        kbnServer.root,
        'post',
        '/internal/fleet/reset_preconfigured_agent_policies/test-12345'
      );
      await resetAPI.set('kbn-sxrf', 'xx').expect(200).send();

      const agentPolicies = await soClient.find<AgentPolicySOAttributes>({
        type: 'ingest-agent-policies',
        perPage: 10000,
      });
      expect(agentPolicies.saved_objects).toHaveLength(2);
      expect(agentPolicies.saved_objects.map((ap) => ap.attributes)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Elastic Cloud agent policy 0001',
            package_policies: expect.arrayContaining([expect.stringMatching(/.*/)]),
          }),
          expect.objectContaining({
            name: 'Second preconfigured policy',
          }),
        ])
      );
    });
  });
});
