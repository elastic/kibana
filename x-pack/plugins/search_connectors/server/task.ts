/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart, KibanaRequest, SavedObjectsClient } from '@kbn/core/server';

import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskInstance,
} from '@kbn/task-manager-plugin/server';

import { schema, type TypeOf } from '@kbn/config-schema';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import { fetchConnectors } from '@kbn/search-connectors';
import type {
  SearchConnectorsPluginStartDependencies,
  SearchConnectorsPluginStart,
  SearchConnectorsPluginSetupDependencies,
} from './types';

/**
 * WARNING: Do not modify the existing versioned schema(s) below, instead define a new version (ex: 2, 3, 4).
 * This is required to support zero-downtime upgrades and rollbacks. See https://github.com/elastic/kibana/issues/155764.
 *
 * As you add a new schema version, don't forget to change latestTaskStateSchema variable to reference the latest schema.
 * For example, changing stateSchemaByVersion[1].schema to stateSchemaByVersion[2].schema.
 */
const stateSchemaByVersion = {
  1: {
    // A task that was created < 8.10 will go through this "up" migration
    // to ensure it matches the v1 schema.
    up: (state: Record<string, unknown>) => ({
      // TODO: delte method
      runs: state.runs || 0,
      agentlessConnectorsDeployed: state.agentlessConnectorsDeployed || 0,
      agentlessConnectorsRemoved: state.agentlessConnectorsRemoved || 0,
    }),
    schema: schema.object({
      runs: schema.number(),
      agentlessConnectorsDeployed: schema.number(),
      agentlessConnectorsRemoved: schema.number(),
    }),
  },
};

const AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID = 'search:agentless-connectors-sync-task';
const AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE = 'search:agentless-connectors-sync';

const latestTaskStateSchema = stateSchemaByVersion[1].schema;
type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;

export class AgentlessConnectorDeploymentsSyncService {
  private log: { error: (t: string, e?: Error) => void; [l: string]: (t: string) => void };

  constructor(logger: Logger) {
    this.log = createLocalLogger(
      logger,
      `Task ${AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE}: `
    );
  }
  public registerSyncTask(
    plugins: SearchConnectorsPluginSetupDependencies,
    coreStartServicesPromise: Promise<
      [CoreStart, SearchConnectorsPluginStartDependencies, SearchConnectorsPluginStart]
    >
  ) {
    const taskManager = plugins.taskManager;

    taskManager.registerTaskDefinitions({
      [AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE]: {
        title: 'ML saved objet sync',
        description: "This task periodically syncs ML's saved objects",
        timeout: '1m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              this.log.info('HEHE RUNNING SYNC TASK');
              const pkgName = 'elastic_connectors';
              const startServices = await coreStartServicesPromise;
              const policyService = startServices[1].fleet.agentPolicyService;
              const agentService = startServices[1].fleet.packagePolicyService;
              const esClient = startServices[0].elasticsearch.client.asInternalUser;

              const soClient = new SavedObjectsClient(
                startServices[0].savedObjects.createInternalRepository()
              );

              const policiesIterator = await agentService.fetchAllItems(soClient, {
                perPage: 50,
                kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${pkgName}`,
              });

              const nativeConnectors = await fetchConnectors(esClient);

              const connectors_metadata = [];

              for (const connector of nativeConnectors) {
                if (connector.is_native) {
                  connectors_metadata.push({
                    id: connector.id,
                    name: connector.name,
                    service_type: connector.service_type,
                  });
                }
              }

              const policiesMetadata = [];
              for await (const policyPage of policiesIterator) {
                for (const policy of policyPage) {
                  for (const input of policy.inputs) {
                    if (input.type === 'connectors-py') {
                      this.log.info(JSON.stringify(input));
                      if (input.compiled_input != null) {
                        policiesMetadata.push({
                          id: policy.id,
                          service_type: input.compiled_input.service_type,
                          connector_id: input.compiled_input.connector_id,
                          connector_name: input.compiled_input.connector_name,
                        });
                      }
                    }
                  }
                }
              }
              this.log.info('Here are all connectors:');
              this.log.info(JSON.stringify(connectors_metadata));

              this.log.info('Here are all policies:');
              this.log.info(JSON.stringify(policiesMetadata));

              const connectors_without_policies = connectors_metadata.filter(
                (x) => policiesMetadata.filter((y) => y.connector_id === x.id).length === 0
              );

              for (const connector_metadata of connectors_without_policies) {
                this.log.info('Connector has no policy attached!');
                this.log.info(JSON.stringify(connector_metadata));

                const agent_policy_id = `autogenerated-${connector_metadata.service_type}-${connector_metadata.id}`;

                this.log.info('Creating a policy!');
                const createdpolicy = await policyService.create(
                  soClient,
                  esClient,
                  {
                    id: agent_policy_id,
                    name: `${connector_metadata.service_type} connector ${connector_metadata.id}`,
                    description: 'Automatically created by a migration',
                    namespace: 'default',
                    monitoring_enabled: ['logs', 'metrics'],
                    inactivity_timeout: 1209600,
                    is_protected: false,
                    supports_agentless: true,
                  },
                  {
                    id: agent_policy_id,
                  }
                );
                this.log.info('Created a policy!');
                this.log.info(JSON.stringify(createdpolicy));

                this.log.info('Creating an integration!');
                await agentService.create(soClient, esClient, {
                  policy_ids: [agent_policy_id],
                  package: {
                    title: 'Elastic Connectors',
                    name: 'elastic_connectors',
                    version: '0.0.4',
                  },
                  name: `[autogenerated] elastic_connectors-${connector_metadata.service_type}-${connector_metadata.id}`,
                  description: '',
                  namespace: '',
                  enabled: true,
                  inputs: [
                    {
                      type: 'connectors-py',
                      enabled: true,
                      vars: {
                        connector_id: { type: 'string', value: connector_metadata.id },
                        connector_name: { type: 'string', value: connector_metadata.name },
                        service_type: { type: 'string', value: connector_metadata.service_type },
                      },
                      streams: [],
                    },
                  ],
                });
              }

              const state = taskInstance.state as LatestTaskStateSchema;

              const updatedState: LatestTaskStateSchema = {
                runs: (state.runs || 0) + 1,
                agentlessConnectorsDeployed: 0,
                agentlessConnectorsRemoved: 0,
              };

              try {
                this.log.info(`ALL GOOD, TASK IS RUNNING`);
                return {
                  state: updatedState,
                  schedule: {
                    interval: '30s',
                  },
                };
              } catch (e) {
                this.log.warn(`Error executing alerting apiKey invalidation task: ${e.message}`);
                return {
                  state: updatedState,
                  schedule: {
                    interval: '10s',
                  },
                };
              }
            },
            cancel: async () => {
              this.log.warn('timed out');
            },
          };
        },
      },
    });
  }

  public async scheduleSyncTask(
    taskManager: TaskManagerStartContract
  ): Promise<TaskInstance | null> {
    this.log.info('HEHE SCHEDULING SYNC TASK');
    try {
      await taskManager.removeIfExists(AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID);
      const state: LatestTaskStateSchema = {
        runs: 0,
        agentlessConnectorsDeployed: 0,
        agentlessConnectorsRemoved: 0,
      };
      const taskInstance = await taskManager.ensureScheduled({
        id: AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID,
        taskType: AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_TYPE,
        schedule: {
          interval: '10s',
        },
        params: {},
        state,
        scope: ['search'],
      });

      this.log.info(`scheduled with interval ${taskInstance.schedule?.interval}`);

      return taskInstance;
    } catch (e) {
      this.log.error(
        `Error running task: ${AGENTLESS_CONNECTOR_DEPLOYMENTS_SYNC_TASK_ID}, `,
        e?.message ?? e
      );
      return null;
    }
  }
}

function createLocalLogger(logger: Logger, preText: string) {
  return {
    info: (text: string) => logger.info(`${preText}${text}`),
    warn: (text: string) => logger.warn(`${preText}${text}`),
    error: (text: string, e?: Error) => logger.error(`${preText}${text} ${e ?? ''}`),
  };
}
