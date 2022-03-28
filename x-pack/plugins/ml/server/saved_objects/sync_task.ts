/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, CoreStart, IScopedClusterClient } from 'kibana/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  TaskInstance,
} from '../../../task_manager/server';
import type { SecurityPluginSetup } from '../../../security/server';
import { savedObjectClientsFactory } from './util';
import { mlSavedObjectServiceFactory } from './service';
import { syncSavedObjectsFactory } from './sync';

const SAVED_OBJECTS_SYNC_TASK_TYPE = 'ML:saved-objects-sync';
const SAVED_OBJECTS_SYNC_TASK_ID = 'ML:saved-objects-sync-task';
const SAVED_OBJECTS_SYNC_INTERVAL_DEFAULT = '1h';

export class SavedObjectsSyncService {
  private core: CoreStart | null = null;
  private log: { error: (t: string, e?: Error) => void; [l: string]: (t: string) => void };

  constructor(logger: Logger) {
    this.log = createLocalLogger(logger, `Task ${SAVED_OBJECTS_SYNC_TASK_ID}: `);
  }

  public registerSyncTask(
    taskManager: TaskManagerSetupContract,
    security: SecurityPluginSetup | undefined,
    spacesEnabled: boolean,
    isMlReady: () => Promise<void>
  ) {
    taskManager.registerTaskDefinitions({
      [SAVED_OBJECTS_SYNC_TASK_TYPE]: {
        title: 'ML saved objet sync',
        description: "This task periodically syncs ML's saved objects",
        timeout: '1m',
        maxAttempts: 3,
        maxConcurrency: 1,

        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              await isMlReady();
              const core = this.core;
              const { state } = taskInstance;

              if (core === null || security === null || spacesEnabled === null) {
                const error = 'dependencies not initialized';
                this.log.error(error);
                throw new Error(error);
              }
              const client = core.elasticsearch.client as unknown as IScopedClusterClient;

              const { getInternalSavedObjectsClient } = savedObjectClientsFactory(
                () => core.savedObjects
              );
              const savedObjectsClient = getInternalSavedObjectsClient();
              if (savedObjectsClient === null) {
                const error = 'Internal saved object client not initialized';
                this.log.error(error);
                throw new Error(error);
              }

              const mlSavedObjectService = mlSavedObjectServiceFactory(
                savedObjectsClient,
                savedObjectsClient,
                spacesEnabled,
                security?.authz,
                client,
                isMlReady
              );
              const { initSavedObjects } = syncSavedObjectsFactory(client, mlSavedObjectService);
              const { jobs, trainedModels } = await initSavedObjects(false);
              const count = jobs.length + trainedModels.length;

              this.log.info(
                count
                  ? `${count} ML saved object${count > 1 ? 's' : ''} synced`
                  : 'No ML saved objects in need of synchronization'
              );

              return {
                state: {
                  runs: (state.runs ?? 0) + 1,
                  totalSavedObjectsSynced: (state.totalSavedObjectsSynced ?? 0) + count,
                },
              };
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
    taskManager: TaskManagerStartContract,
    core: CoreStart
  ): Promise<TaskInstance | null> {
    this.core = core;
    try {
      await taskManager.removeIfExists(SAVED_OBJECTS_SYNC_TASK_ID);
      const taskInstance = await taskManager.ensureScheduled({
        id: SAVED_OBJECTS_SYNC_TASK_ID,
        taskType: SAVED_OBJECTS_SYNC_TASK_TYPE,
        schedule: {
          interval: SAVED_OBJECTS_SYNC_INTERVAL_DEFAULT,
        },
        params: {},
        state: {
          runs: 0,
          totalSavedObjectsSynced: 0,
        },
        scope: ['ml'],
      });

      this.log.info(`scheduled with interval ${taskInstance.schedule?.interval}`);

      return taskInstance;
    } catch (e) {
      this.log.error(`Error running task: ${SAVED_OBJECTS_SYNC_TASK_ID}, `, e?.message() ?? e);
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
