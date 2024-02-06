/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  type Logger,
  SavedObjectsErrorHelpers,
  type StartServicesAccessor,
} from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { StartPlugins } from '../../../../plugin';
import { entityStoreServiceFactory } from '../entity_store_service';
import { RiskEngineDataClient } from '../../risk_engine/risk_engine_data_client';
import { RiskScoreDataClient } from '../../risk_score/risk_score_data_client';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as EntityStoreTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { buildScopedInternalSavedObjectsClientUnsafe } from './helpers';
import type { ExperimentalFeatures } from '../../../../../common';
import {
  AssetCriticalityDataClient,
  assetCriticalityServiceFactory,
} from '../../asset_criticality';
import { EntityStoreDataClient } from '../entity_store_data_client';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type GetEntityStoreService = (
  namespace: string
) => Promise<ReturnType<typeof entityStoreServiceFactory>>;

export const registerEntityStoreTask = ({
  experimentalFeatures,
  getStartServices,
  kibanaVersion,
  logger,
  taskManager,
  telemetry,
}: {
  experimentalFeatures: ExperimentalFeatures;
  getStartServices: StartServicesAccessor<StartPlugins>;
  kibanaVersion: string;
  logger: Logger;
  taskManager: TaskManagerSetupContract | undefined;
  telemetry: AnalyticsServiceSetup;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping entity store task registration.');
    return;
  }

  const getEntityStoreService: GetEntityStoreService = (namespace) =>
    getStartServices().then(([coreStart, _]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });

      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient,
        logger,
        namespace,
      });
      const assetCriticalityService = assetCriticalityServiceFactory({
        assetCriticalityDataClient,
        experimentalFeatures,
      });
      const entityStoreDataClient = new EntityStoreDataClient({
        logger,
        esClient,
        namespace,
      });
      const riskEngineDataClient = new RiskEngineDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
      });
      const riskScoreDataClient = new RiskScoreDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
      });

      return entityStoreServiceFactory({
        assetCriticalityService,
        esClient,
        logger,
        riskEngineDataClient,
        entityStoreDataClient,
        riskScoreDataClient,
        spaceId: namespace,
      });
    });

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics entity store - Check for updates Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({ logger, getEntityStoreService, telemetry }),
    },
  });
};

export const startEntityStoreTask = async ({
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

export const removeEntityStoreTask = async ({
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
      logger.error(`Failed to remove entity store task: ${err.message}`);
      throw err;
    }
  }
};

export const runTask = async ({
  getEntityStoreService,
  isCancelled,
  logger,
  taskInstance,
  telemetry,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  getEntityStoreService: GetEntityStoreService;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
}): Promise<{
  state: EntityStoreTaskState;
}> => {
  const state = taskInstance.state as EntityStoreTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  const taskStartTime = moment().utc().toISOString();
  log('running task');

  const updatedState: EntityStoreTaskState = {
    timestamps: {
      lastExecution: taskStartTime,
    },
    namespace: state.namespace,
    runs: state.runs + 1,
  };

  if (taskId !== getTaskId(state.namespace)) {
    log('outdated task; exiting');
    return { state: updatedState };
  }

  const entityStoreService = await getEntityStoreService(state.namespace);
  if (!entityStoreService) {
    log('entity store service is not available; exiting task');
    return { state: updatedState };
  }

  const { entitiesUpdated, entitiesCreated, errors, timestamps, ids } =
    await entityStoreService.updateEntityStore({
      timestamps: state.timestamps,
      ids: state.ids,
    });

  log(`errors: ${errors}`);
  log(`entitiesUpdated: ${entitiesUpdated}`);
  log(`entitiesCreated: ${entitiesCreated}`);
  updatedState.timestamps = timestamps;
  updatedState.ids = ids;

  const taskCompletionTime = moment().utc().toISOString();
  const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
  log(`taskDurationInSeconds: ${taskDurationInSeconds}`);
  if (isCancelled()) {
    log('task was cancelled');
  }

  log('task run completed');
  return {
    state: updatedState,
  };
};

const createTaskRunnerFactory =
  ({
    logger,
    getEntityStoreService,
    telemetry,
  }: {
    logger: Logger;
    getEntityStoreService: GetEntityStoreService;
    telemetry: AnalyticsServiceSetup;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({ getEntityStoreService, isCancelled, logger, taskInstance, telemetry }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
