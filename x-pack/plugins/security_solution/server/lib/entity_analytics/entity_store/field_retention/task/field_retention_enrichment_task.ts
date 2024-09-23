/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import { EntityClient } from '@kbn/entityManager-plugin/server/lib/entity_client';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreFieldRetentionTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { EntityStoreDataClient } from '../../entity_store_data_client';
import type { EntityAnalyticsRoutesDeps } from '../../../types';
import { buildScopedInternalSavedObjectsClientUnsafe } from '../../../risk_score/tasks/helpers';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type GetEntityStoreDataClient = (namespace: string) => Promise<EntityStoreDataClient>;

export const registerEntityStoreFieldRetentionEnrichTask = ({
  getStartServices,
  logger,
  auditLogger,
  taskManager,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  taskManager: TaskManagerSetupContract | undefined;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping entity store enrich policy registration.');
    return;
  }

  const getEntityStoreDataClient: GetEntityStoreDataClient = async (namespace: string) => {
    const [coreStart, _] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });
    const entityClient = new EntityClient({
      esClient,
      soClient,
      logger,
    });
    return new EntityStoreDataClient({
      esClient,
      logger,
      namespace,
      entityClient,
      soClient,
    });
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Entity Store - Execute Enrich Policy Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({
        logger,
        getEntityStoreDataClient,
      }),
    },
  });
};

export const startEntityStoreFieldRetentionEnrichTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  const log = logFactory(logger, taskId);
  log('starting task');

  log('attempting to schedule');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: getTaskName(),
      scope: SCOPE,
      schedule: {
        interval: INTERVAL,
      },
      state: { ...defaultState, namespace },
      params: { version: VERSION },
    });
  } catch (e) {
    logger.warn(`[task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

export const removeEntityStoreFieldRetentionEnrichTask = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  try {
    await taskManager.remove(getTaskId(namespace));
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(`Failed to remove  entity store enrich policy task: ${err.message}`);
      throw err;
    }
  }
};

export const runTask = async ({
  getEntityStoreDataClient,
  isCancelled,
  logger,
  taskInstance,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  getEntityStoreDataClient: GetEntityStoreDataClient;
  taskInstance: ConcreteTaskInstance;
}): Promise<{
  state: EntityStoreFieldRetentionTaskState;
}> => {
  const state = taskInstance.state as EntityStoreFieldRetentionTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  try {
    const taskStartTime = moment().utc().toISOString();
    log('running task');

    const updatedState = {
      lastExecutionTimestamp: taskStartTime,
      namespace: state.namespace,
      runs: state.runs + 1,
    };

    if (taskId !== getTaskId(state.namespace)) {
      log('outdated task; exiting');
      return { state: updatedState };
    }

    const entityStoreDataClient = await getEntityStoreDataClient(state.namespace);
    if (!EntityStoreDataClient) {
      log('entity store data client is not available; exiting task');
      return { state: updatedState };
    }

    const { engines } = await entityStoreDataClient.list();

    for (const engine of engines) {
      if (engine.type) {
        // TODO: why is this optional?
        const start = Date.now();
        await entityStoreDataClient.executeFieldRetentionEnrichPolicy(engine.type);
        log(`executed field retention enrich policy for ${engine.type} in ${Date.now() - start}ms`);
      }
    }

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    log(`task run completed in ${taskDurationInSeconds} seconds`);

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`[task ${taskId}]: error running task, received ${e.message}`);
    throw e;
  }
};
export const scheduleNow = async ({
  logger,
  namespace,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  const log = logFactory(logger, taskId);

  log('attempting to schedule task to run now');
  try {
    await taskManager.runSoon(taskId);
  } catch (e) {
    logger.warn(`[task ${taskId}]: error scheduling task now, received ${e.message}`);
    throw e;
  }
};

const createTaskRunnerFactory =
  ({
    logger,
    getEntityStoreDataClient,
  }: {
    logger: Logger;
    getEntityStoreDataClient: GetEntityStoreDataClient;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({
          getEntityStoreDataClient,
          isCancelled,
          logger,
          taskInstance,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
