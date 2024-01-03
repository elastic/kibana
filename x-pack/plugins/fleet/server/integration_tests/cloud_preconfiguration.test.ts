/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createRootWithCorePlugins,
  createTestServers,
} from '@kbn/core-test-helpers-kbn-server';

import { AGENT_POLICY_INDEX } from '../../common';
import type {
  AgentPolicySOAttributes,
  PackagePolicySOAttributes,
  OutputSOAttributes,
} from '../types';

import { useDockerRegistry, waitForFleetSetup } from './helpers';
import {
  CLOUD_KIBANA_CONFIG,
  CLOUD_KIBANA_CONFIG_WITHOUT_APM,
  CLOUD_KIBANA_WITHOUT_PACKAGE_POLICY_ID_CONFIG,
} from './fixtures';

const logFilePath = Path.join(__dirname, 'logs.log');

describe('Fleet cloud preconfiguration', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async (defaultKbnConfig: any = CLOUD_KIBANA_CONFIG) => {
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
    const startOrRestartKibana = async (kbnConfig: any = defaultKbnConfig) => {
      if (kbnServer) {
        await kbnServer.stop();
      }

      const root = createRootWithCorePlugins(
        {
          xpack: {
            ...kbnConfig.xpack,
            fleet: {
              ...kbnConfig.xpack.fleet,
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

      kbnServer = {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
      await waitForFleetSetup(kbnServer.root);
    };
    await startOrRestartKibana();

    return {
      startOrRestartKibana,
    };
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

  describe('Preconfigured cloud policy', () => {
    describe('With a full preconfigured cloud policy', () => {
      beforeAll(async () => {
        await startServers();
      });

      afterAll(async () => {
        await stopServers();
      });

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

        const data = (res.hits.hits[0]._source as any)!.data;

        // Remove package version to avoid upgrading this test for each new package dev version
        data.inputs.forEach((input: any) => {
          delete input.meta.package.version;
          if (input['apm-server']) {
            input['apm-server'].agent.config.elasticsearch.api_key = '';
            input['apm-server'].rum.source_mapping.elasticsearch.api_key = '';
          }
        });

        expect(data).toEqual(
          expect.objectContaining({
            agent: {
              download: {
                sourceURI: 'https://artifacts.elastic.co/downloads/',
              },
              features: {},
              monitoring: {
                enabled: false,
                logs: false,
                metrics: false,
              },
              protection: {
                enabled: false,
                signing_key: data.agent.protection.signing_key,
                uninstall_token_hash: data.agent.protection.uninstall_token_hash,
              },
            },
            id: 'policy-elastic-agent-on-cloud',
            inputs: expect.arrayContaining([
              {
                data_stream: {
                  namespace: 'default',
                },
                id: 'fleet-server-fleet_server-elastic-cloud-fleet-server',
                meta: {
                  package: {
                    name: 'fleet_server',
                  },
                },
                name: 'Fleet Server',
                package_policy_id: 'elastic-cloud-fleet-server',
                revision: 1,
                'server.runtime': {
                  gc_percent: 20,
                },
                type: 'fleet-server',
                unused_key: 'not_used',
                use_output: 'es-containerhost',
              },
              {
                'apm-server': {
                  agent: {
                    config: {
                      elasticsearch: {
                        api_key: '',
                      },
                    },
                  },
                  agent_config: [],
                  auth: {
                    anonymous: {
                      allow_agent: ['rum-js', 'js-base', 'iOS/swift'],
                      allow_service: null,
                      enabled: true,
                      rate_limit: {
                        event_limit: 300,
                        ip_limit: 1000,
                      },
                    },
                    api_key: {
                      enabled: true,
                      limit: 100,
                    },
                    secret_token: 'CLOUD_SECRET_TOKEN',
                  },
                  capture_personal_data: true,
                  default_service_environment: null,
                  'expvar.enabled': false,
                  host: '0.0.0.0:8200',
                  idle_timeout: '45s',
                  java_attacher: {
                    'discovery-rules': null,
                    'download-agent-version': null,
                    enabled: false,
                  },
                  max_connections: 0,
                  max_event_size: 307200,
                  max_header_size: 1048576,
                  'pprof.enabled': false,
                  read_timeout: '3600s',
                  response_headers: null,
                  rum: {
                    allow_headers: null,
                    allow_origins: ['*'],
                    enabled: true,
                    exclude_from_grouping: '^/webpack',
                    library_pattern: 'node_modules|bower_components|~',
                    response_headers: null,
                    source_mapping: {
                      elasticsearch: {
                        api_key: '',
                      },
                      metadata: [],
                    },
                  },
                  sampling: {
                    tail: {
                      enabled: false,
                      interval: '1m',
                      policies: [
                        {
                          sample_rate: 0.1,
                        },
                      ],
                      storage_limit: '3GB',
                    },
                  },
                  shutdown_timeout: '30s',
                  ssl: {
                    certificate: '/app/config/certs/node.crt',
                    cipher_suites: null,
                    curve_types: null,
                    enabled: true,
                    key: '/app/config/certs/node.key',
                    key_passphrase: null,
                    supported_protocols: ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
                  },
                  write_timeout: '30s',
                },
                data_stream: {
                  namespace: 'default',
                },
                id: 'elastic-cloud-apm',
                meta: {
                  package: {
                    name: 'apm',
                  },
                },
                name: 'Elastic APM',
                package_policy_id: 'elastic-cloud-apm',
                revision: 2,
                type: 'apm',
                use_output: 'es-containerhost',
              },
            ]),
            output_permissions: {
              'es-containerhost': {
                _elastic_agent_checks: {
                  cluster: ['monitor'],
                },
                _elastic_agent_monitoring: {
                  indices: [],
                },
                'elastic-cloud-apm': {
                  cluster: ['cluster:monitor/main'],
                  indices: [
                    {
                      names: ['traces-*', 'logs-*', 'metrics-*'],
                      privileges: ['auto_configure', 'create_doc'],
                    },
                    {
                      names: ['traces-apm.sampled-*'],
                      privileges: [
                        'auto_configure',
                        'create_doc',
                        'maintenance',
                        'monitor',
                        'read',
                      ],
                    },
                  ],
                },
                'elastic-cloud-fleet-server': {
                  indices: [],
                },
              },
            },
            outputs: {
              'es-containerhost': {
                hosts: ['https://cloudinternales:9200'],
                type: 'elasticsearch',
                preset: 'balanced',
              },
            },
            revision: 5,
            secret_references: [],
            signed: data.signed,
          })
        );
      });

      it('Create correct package policies', async () => {
        const packagePolicies = await kbnServer.coreStart.savedObjects
          .createInternalRepository()
          .find<PackagePolicySOAttributes>({
            type: 'ingest-package-policies',
            perPage: 10000,
          });

        expect(
          packagePolicies.saved_objects.find((so) => so.id === 'elastic-cloud-fleet-server')
        ).toBeDefined();
        expect(
          packagePolicies.saved_objects.find((so) => so.id === 'elastic-cloud-apm')
        ).toBeDefined();
        expect(
          packagePolicies.saved_objects.find((so) => so.id === 'default-system')
        ).toBeDefined();

        const fleetServerPackagePolicy = packagePolicies.saved_objects.find(
          (so) => so.id === 'elastic-cloud-fleet-server'
        );
        expect(fleetServerPackagePolicy?.attributes.vars).toMatchInlineSnapshot(`undefined`);
        expect(fleetServerPackagePolicy?.attributes.inputs).toMatchInlineSnapshot(`
          Array [
            Object {
              "compiled_input": Object {
                "server.runtime": Object {
                  "gc_percent": 20,
                },
                "unused_key": "not_used",
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
                  "value": "0.0.0.0",
                },
                "max_agents": Object {
                  "type": "integer",
                },
                "max_connections": Object {
                  "type": "integer",
                },
                "port": Object {
                  "frozen": true,
                  "value": 8220,
                },
              },
            },
          ]
        `);
      });
    });
    describe('Adding APM to a preconfigured agent policy after first setup', () => {
      beforeAll(async () => {
        // 1. Start with a preconfigured policy withtout APM
        const { startOrRestartKibana } = await startServers(CLOUD_KIBANA_CONFIG_WITHOUT_APM);

        // 2. Add APM to the preconfigured policy
        await startOrRestartKibana(CLOUD_KIBANA_CONFIG);
      });

      afterAll(async () => {
        await stopServers();
      });

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

      it('Create a .fleet-policies document with the APM package policy', async () => {
        const res = await kbnServer.coreStart.elasticsearch.client.asInternalUser.search({
          index: AGENT_POLICY_INDEX,
          q: `policy_id:policy-elastic-agent-on-cloud`,
          sort: 'revision_idx:desc',
        });

        expect(
          (res.hits.hits[0]._source as any)!.data.inputs.find(
            (input: any) => input.meta.package.name === 'apm'
          )
        ).toBeDefined();
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
        expect(
          packagePolicies.saved_objects.find((so) => so.id === 'default-system')
        ).toBeDefined();
      });
    });

    describe('Adding package policy id to a preconfigured package policy after first setup', () => {
      beforeAll(async () => {
        // 1. Start with a preconfigured policy withtout APM
        const { startOrRestartKibana } = await startServers(
          CLOUD_KIBANA_WITHOUT_PACKAGE_POLICY_ID_CONFIG
        );

        // 2. Add pacakge policy ids to the preconfigured policy
        await startOrRestartKibana(CLOUD_KIBANA_CONFIG);
      });

      afterAll(async () => {
        await stopServers();
      });

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

      it('Create correct package policies and use the name of package policies instead of id', async () => {
        const packagePolicies = await kbnServer.coreStart.savedObjects
          .createInternalRepository()
          .find<PackagePolicySOAttributes>({
            type: 'ingest-package-policies',
            perPage: 10000,
          });

        expect(packagePolicies.total).toBe(3);
        expect(
          packagePolicies.saved_objects.find((so) => so.attributes.name === 'Fleet Server')
        ).toBeDefined();
        expect(
          packagePolicies.saved_objects.find((so) => so.attributes.name === 'Elastic APM')
        ).toBeDefined();
      });
    });

    describe('Support removing a field from output after first setup', () => {
      beforeAll(async () => {
        // 1. Start with a preconfigured policy withtout APM
        const { startOrRestartKibana } = await startServers({
          xpack: {
            fleet: {
              outputs: [
                {
                  name: 'Elastic Cloud internal output',
                  type: 'elasticsearch',
                  id: 'es-containerhost',
                  hosts: ['https://cloudinternales:9200'],
                  config: { test: '123' },
                },
              ],
            },
          },
        });

        // 2. Change the output remove config
        await startOrRestartKibana({
          xpack: {
            fleet: {
              outputs: [
                {
                  name: 'Elastic Cloud internal output',
                  type: 'elasticsearch',
                  id: 'es-containerhost',
                  hosts: ['https://cloudinternales:9200'],
                },
              ],
            },
          },
        });
      });

      afterAll(async () => {
        await stopServers();
      });

      it('Works and preconfigure correctly agent policies', async () => {
        const agentPolicies = await kbnServer.coreStart.savedObjects
          .createInternalRepository()
          .find<OutputSOAttributes>({
            type: 'ingest-outputs',
            perPage: 10000,
          });

        expect(agentPolicies.total).toBe(2);
        const outputSO = agentPolicies.saved_objects.find(
          (so) => so.attributes.output_id === 'es-containerhost'
        );
        expect(outputSO).toBeDefined();
        expect(outputSO?.attributes.config_yaml).toBeNull();
      });
    });
  });
});
