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
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as AssetCriticalityTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { AssetCriticalityDataClient } from '..';
import type { EntityAnalyticsRoutesDeps } from '../../types';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type GetAssetCriticalityDataClient = (namespace: string) => Promise<AssetCriticalityDataClient>;

export const registerAssetCriticalityEnrichTask = ({
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
    logger.info('Task Manager is unavailable; skipping asset criticality task registration.');
    return;
  }

  const getAssetCriticalityDataClient: GetAssetCriticalityDataClient = async (
    namespace: string
  ) => {
    const [coreStart, _] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    return new AssetCriticalityDataClient({
      esClient,
      logger,
      auditLogger,
      namespace,
    });
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Asset Criticality - Execute Enrich Policy Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({
        logger,
        getAssetCriticalityDataClient,
      }),
    },
  });
};

export const startAssetCriticalityEnrichTask = async ({
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

export const removeAssetCriticalityEnrichTask = async ({
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
      logger.error(`Failed to remove asset criticality Enrich task: ${err.message}`);
      throw err;
    }
  }
};

export const runTask = async ({
  getAssetCriticalityDataClient,
  isCancelled,
  logger,
  taskInstance,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  getAssetCriticalityDataClient: GetAssetCriticalityDataClient;
  taskInstance: ConcreteTaskInstance;
}): Promise<{
  state: AssetCriticalityTaskState;
}> => {
  const state = taskInstance.state as AssetCriticalityTaskState;
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

    const assetCriticalityDataClient = await getAssetCriticalityDataClient(state.namespace);
    if (!assetCriticalityDataClient) {
      log('asset criticality client is not available; exiting task');
      return { state: updatedState };
    }

    await assetCriticalityDataClient.ensureEnrichPolicies();
    await assetCriticalityDataClient.executeEnrichPolicies();

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
    getAssetCriticalityDataClient,
  }: {
    logger: Logger;
    getAssetCriticalityDataClient: GetAssetCriticalityDataClient;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({
          getAssetCriticalityDataClient,
          isCancelled,
          logger,
          taskInstance,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
