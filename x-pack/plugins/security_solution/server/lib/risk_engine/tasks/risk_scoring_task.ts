/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { asyncForEach } from '@kbn/std';
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

import type { AfterKeys, IdentifierType } from '../../../../common/risk_engine';
import type { StartPlugins } from '../../../plugin';
import { type RiskScoreService, riskScoreServiceFactory } from '../risk_score_service';
import { RiskEngineDataClient } from '../risk_engine_data_client';
import { isRiskScoreCalculationComplete } from '../helpers';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as RiskScoringTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { buildScopedInternalSavedObjectsClient, convertRangeToISO } from './helpers';
import { RiskScoreEntity } from '../../../../common/risk_engine/types';

const logFactory =
  (logger: Logger, taskId: string) =>
  (message: string): void =>
    logger.info(`[task ${taskId}]: ${message}`);

const getTaskName = (): string => TYPE;

const getTaskId = (namespace: string): string => `${TYPE}:${namespace}:${VERSION}`;

type GetRiskScoreService = (namespace: string) => Promise<RiskScoreService>;

export const registerRiskScoringTask = ({
  getStartServices,
  kibanaVersion,
  logger,
  taskManager,
}: {
  getStartServices: StartServicesAccessor<StartPlugins>;
  kibanaVersion: string;
  logger: Logger;
  taskManager: TaskManagerSetupContract | undefined;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping risk engine task registration.');
    return;
  }

  const getRiskScoreService: GetRiskScoreService = (namespace) =>
    getStartServices().then(([coreStart, _]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = buildScopedInternalSavedObjectsClient({ coreStart, namespace });
      const riskEngineDataClient = new RiskEngineDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
      });

      return riskScoreServiceFactory({
        esClient,
        logger,
        riskEngineDataClient,
        spaceId: namespace,
      });
    });

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Risk Engine - Risk Scoring Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({ logger, getRiskScoreService }),
    },
  });
};

export const startRiskScoringTask = async ({
  logger,
  namespace,
  riskEngineDataClient,
  taskManager,
}: {
  logger: Logger;
  namespace: string;
  riskEngineDataClient: RiskEngineDataClient;
  taskManager: TaskManagerStartContract;
}) => {
  const taskId = getTaskId(namespace);
  const log = logFactory(logger, taskId);
  log('starting task');
  const interval = (await riskEngineDataClient.getConfiguration())?.interval ?? INTERVAL;

  log('attempting to schedule');
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: getTaskName(),
      scope: SCOPE,
      schedule: {
        interval,
      },
      state: { ...defaultState, namespace },
      params: { version: VERSION },
    });
  } catch (e) {
    logger.warn(`[task ${taskId}]: error scheduling task, received ${e.message}`);
    throw e;
  }
};

export const removeRiskScoringTask = async ({
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
      logger.error(`Failed to remove risk scoring task: ${err.message}`);
      throw err;
    }
  }
};

export const runTask = async ({
  getRiskScoreService,
  logger,
  taskInstance,
}: {
  logger: Logger;
  getRiskScoreService: GetRiskScoreService;
  taskInstance: ConcreteTaskInstance;
}): Promise<{
  state: RiskScoringTaskState;
}> => {
  const state = taskInstance.state as RiskScoringTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  const taskExecutionTime = moment().utc().toISOString();
  log('running task');

  let scoresWritten = 0;
  const updatedState = {
    lastExecutionTimestamp: taskExecutionTime,
    namespace: state.namespace,
    runs: state.runs + 1,
    scoresWritten,
  };

  if (taskId !== getTaskId(state.namespace)) {
    log('outdated task; exiting');
    return { state: updatedState };
  }

  const riskScoreService = await getRiskScoreService(state.namespace);
  if (!riskScoreService) {
    log('risk score service is not available; exiting task');
    return { state: updatedState };
  }

  const configuration = await riskScoreService.getConfiguration();
  if (configuration == null) {
    log(
      'Risk engine configuration not found; exiting task. Please reinitialize the risk engine and try again'
    );
    return { state: updatedState };
  }

  const {
    dataViewId,
    enabled,
    filter,
    identifierType: configuredIdentifierType,
    range: configuredRange,
    pageSize,
  } = configuration;
  if (!enabled) {
    log('risk engine is not enabled, exiting task');
    return { state: updatedState };
  }

  const range = convertRangeToISO(configuredRange);
  const { index, runtimeMappings } = await riskScoreService.getRiskInputsIndex({
    dataViewId,
  });
  const identifierTypes: IdentifierType[] = configuredIdentifierType
    ? [configuredIdentifierType]
    : [RiskScoreEntity.host, RiskScoreEntity.user];

  await asyncForEach(identifierTypes, async (identifierType) => {
    let isWorkComplete = false;
    let afterKeys: AfterKeys = {};
    while (!isWorkComplete) {
      const result = await riskScoreService.calculateAndPersistScores({
        afterKeys,
        index,
        filter,
        identifierType,
        pageSize,
        range,
        runtimeMappings,
        weights: [],
      });

      isWorkComplete = isRiskScoreCalculationComplete(result);
      afterKeys = result.after_keys;
      scoresWritten += result.scores_written;
    }
  });

  updatedState.scoresWritten = scoresWritten;

  log('task run completed');
  return {
    state: updatedState,
  };
};

const createTaskRunnerFactory =
  ({ logger, getRiskScoreService }: { logger: Logger; getRiskScoreService: GetRiskScoreService }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    return {
      run: async () => runTask({ getRiskScoreService, logger, taskInstance }),
      cancel: async () => {},
    };
  };
