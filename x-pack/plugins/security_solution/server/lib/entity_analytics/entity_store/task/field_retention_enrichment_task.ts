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
import type { EntityType } from '../../../../../common/api/entity_analytics/entity_store';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreFieldRetentionTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import type { EntityAnalyticsRoutesDeps } from '../../types';
import {
  getAvailableEntityTypes,
  getUnitedEntityDefinitionVersion,
} from '../united_entity_definitions';
import { executeFieldRetentionEnrichPolicy } from '../elasticsearch_assets';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const debugLogFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.debug(`[task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type ExecuteEnrichPolicy = (
  namespace: string,
  entityType: EntityType
) => ReturnType<typeof executeFieldRetentionEnrichPolicy>;

export const registerEntityStoreFieldRetentionEnrichTask = ({
  getStartServices,
  logger,
  taskManager,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  taskManager: TaskManagerSetupContract | undefined;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping entity store enrich policy registration.');
    return;
  }

  const executeEnrichPolicy: ExecuteEnrichPolicy = async (
    namespace: string,
    entityType: EntityType
  ): ReturnType<typeof executeFieldRetentionEnrichPolicy> => {
    const [coreStart, _] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const unitedDefinitionVersion = getUnitedEntityDefinitionVersion(entityType);

    return executeFieldRetentionEnrichPolicy({
      unitedDefinition: { namespace, entityType, version: unitedDefinitionVersion },
      esClient,
      logger,
    });
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Entity Store - Execute Enrich Policy Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({
        logger,
        executeEnrichPolicy,
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
  executeEnrichPolicy,
  isCancelled,
  logger,
  taskInstance,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  executeEnrichPolicy: ExecuteEnrichPolicy;
  taskInstance: ConcreteTaskInstance;
}): Promise<{
  state: EntityStoreFieldRetentionTaskState;
}> => {
  const state = taskInstance.state as EntityStoreFieldRetentionTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  const debugLog = debugLogFactory(logger, taskId);
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

    const entityTypes = getAvailableEntityTypes();
    for (const entityType of entityTypes) {
      const start = Date.now();
      debugLog(`executing field retention enrich policy for ${entityType}`);
      try {
        const { executed } = await executeEnrichPolicy(state.namespace, entityType);
        if (!executed) {
          debugLog(`Field retention encrich policy for ${entityType} does not exist`);
        } else {
          log(
            `Executed field retention enrich policy for ${entityType} in ${Date.now() - start}ms`
          );
        }
      } catch (e) {
        log(`error executing field retention enrich policy for ${entityType}: ${e.message}`);
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

const createTaskRunnerFactory =
  ({ logger, executeEnrichPolicy }: { logger: Logger; executeEnrichPolicy: ExecuteEnrichPolicy }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({
          executeEnrichPolicy,
          isCancelled,
          logger,
          taskInstance,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
