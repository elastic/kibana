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
              const startServices = await coreStartServicesPromise;
              const agentService = startServices[1].fleet.packagePolicyService;

              const fakeRequest = {
                headers: {},
                getBasePath: () => '',
                path: '/',
                route: { settings: {} },
                url: { href: {} },
                raw: { req: { url: '/' } },
                isFakeRequest: true,
              } as unknown as KibanaRequest;

              // const soClient = await startServices[0].savedObjects.getScopedClient(fakeRequest);

              const soClient = new SavedObjectsClient(
                startServices[0].savedObjects.createInternalRepository()
              );

              const policiesPage = await agentService.fetchAllItems(soClient);

              this.log.info('Here are all policies:');

              for await (const policy of policiesPage) {
                for (const p of policy) {
                  this.log.info(JSON.stringify(p));
                }
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
