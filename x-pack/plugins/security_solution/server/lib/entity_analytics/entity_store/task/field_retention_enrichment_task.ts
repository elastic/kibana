/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { EntityStoreResource } from '../../../../../common/entity_analytics/entity_store/constants';
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

import { getEntitiesIndexName } from '../utils';
import {
  FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT,
  ENTITY_STORE_USAGE_EVENT,
} from '../../../telemetry/event_based/events';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[Entity Store] [task ${taskId}]: ${message}`);

const debugLogFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.debug(`[Entity Store] [task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type ExecuteEnrichPolicy = (
  namespace: string,
  entityType: EntityType
) => ReturnType<typeof executeFieldRetentionEnrichPolicy>;
type GetStoreSize = (index: string | string[]) => Promise<number>;

export const registerEntityStoreFieldRetentionEnrichTask = ({
  getStartServices,
  logger,
  telemetry,
  taskManager,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  taskManager: TaskManagerSetupContract | undefined;
}): void => {
  if (!taskManager) {
    logger.info(
      '[Entity Store]  Task Manager is unavailable; skipping entity store enrich policy registration.'
    );
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

  const getStoreSize: GetStoreSize = async (index) => {
    const [coreStart] = await getStartServices();
    const esClient = coreStart.elasticsearch.client.asInternalUser;

    const { count } = await esClient.count({ index });
    return count;
  };

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Entity Store - Execute Enrich Policy Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({
        logger,
        telemetry,
        getStoreSize,
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
    logger.warn(`[Entity Store]  [task ${taskId}]: error scheduling task, received ${e.message}`);
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
    logger.info(
      `[Entity Store]  Removed entity store enrich policy task for namespace ${namespace}`
    );
  } catch (err) {
    if (!SavedObjectsErrorHelpers.isNotFoundError(err)) {
      logger.error(
        `[Entity Store]  Failed to remove  entity store enrich policy task: ${err.message}`
      );
      throw err;
    }
  }
};

export const runTask = async ({
  executeEnrichPolicy,
  getStoreSize,
  isCancelled,
  logger,
  taskInstance,
  telemetry,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  executeEnrichPolicy: ExecuteEnrichPolicy;
  getStoreSize: GetStoreSize;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
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
          debugLog(`Field retention enrich policy for ${entityType} does not exist`);
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

    telemetry.reportEvent(FIELD_RETENTION_ENRICH_POLICY_EXECUTION_EVENT.eventType, {
      duration: taskDurationInSeconds,
      interval: INTERVAL,
    });

    // Track entity store usage
    const indices = entityTypes.map((entityType) =>
      getEntitiesIndexName(entityType, state.namespace)
    );
    const storeSize = await getStoreSize(indices);
    telemetry.reportEvent(ENTITY_STORE_USAGE_EVENT.eventType, { storeSize });

    return {
      state: updatedState,
    };
  } catch (e) {
    logger.error(`[Entity Store] [task ${taskId}]: error running task, received ${e.message}`);
    throw e;
  }
};

const createTaskRunnerFactory =
  ({
    logger,
    telemetry,
    executeEnrichPolicy,
    getStoreSize,
  }: {
    logger: Logger;
    telemetry: AnalyticsServiceSetup;
    executeEnrichPolicy: ExecuteEnrichPolicy;
    getStoreSize: GetStoreSize;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({
          executeEnrichPolicy,
          getStoreSize,
          isCancelled,
          logger,
          taskInstance,
          telemetry,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };

export const getEntityStoreFieldRetentionEnrichTaskState = async ({
  namespace,
  taskManager,
}: {
  namespace: string;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  try {
    const taskState = await taskManager.get(taskId);

    return {
      id: taskState.id,
      resource: EntityStoreResource.TASK,
      installed: true,
      enabled: taskState.enabled,
      status: taskState.status,
      retryAttempts: taskState.attempts,
      nextRun: taskState.runAt,
      lastRun: taskState.state.lastExecutionTimestamp,
      runs: taskState.state.runs,
    };
  } catch (e) {
    if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      return {
        id: taskId,
        installed: false,
        resource: EntityStoreResource.TASK,
      };
    }
    throw e;
  }
};
