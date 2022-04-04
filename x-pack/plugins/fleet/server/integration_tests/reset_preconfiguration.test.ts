/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import * as kbnTestServer from 'src/core/test_helpers/kbn_server';

import type { AgentPolicySOAttributes } from '../types';
import { PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE } from '../../common';

import { useDockerRegistry, waitForFleetSetup, getSupertestWithAdminUser } from './helpers';

const logFilePath = Path.join(__dirname, 'logs.log');

describe('Fleet preconfiguration reset', () => {
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
            fleet: {
              registryUrl,
              packages: [
                {
                  name: 'fleet_server',
                  version: 'latest',
                },
              ],
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

    it('Works and reset one preconfigured policies if the policy was deleted with a preconfiguration deletion record', async () => {
      const soClient = kbnServer.coreStart.savedObjects.createInternalRepository();

      await soClient.delete('ingest-agent-policies', POLICY_ID);
      await soClient.create(PRECONFIGURATION_DELETION_RECORD_SAVED_OBJECT_TYPE, {
        id: POLICY_ID,
      });

      const resetAPI = getSupertestWithAdminUser(
        kbnServer.root,
        'post',
        `/internal/fleet/reset_preconfigured_agent_policies/${POLICY_ID}`
      );
      await resetAPI.set('kbn-sxrf', 'xx').expect(200).send();

      const agentPolicies = await kbnServer.coreStart.savedObjects
        .createInternalRepository()
        .find<AgentPolicySOAttributes>({
          type: 'ingest-agent-policies',
          perPage: 10000,
        });
      expect(agentPolicies.saved_objects).toHaveLength(2);
      expect(agentPolicies.saved_objects.map((ap) => ({ ...ap.attributes }))).toEqual(
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
});
