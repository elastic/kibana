/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { asyncForEach } from '@kbn/std';
import { type Logger, SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type { AuditLogger } from '@kbn/security-plugin-types-server';
import type { AfterKeys } from '../../../../../common/api/entity_analytics/common';
import {
  type IdentifierType,
  RiskScoreEntity,
} from '../../../../../common/entity_analytics/risk_engine';
import { type RiskScoreService, riskScoreServiceFactory } from '../risk_score_service';
import { RiskEngineDataClient } from '../../risk_engine/risk_engine_data_client';
import { RiskScoreDataClient } from '../risk_score_data_client';
import { isRiskScoreCalculationComplete } from '../helpers';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as RiskScoringTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { buildScopedInternalSavedObjectsClientUnsafe, convertRangeToISO } from './helpers';
import {
  RISK_SCORE_EXECUTION_SUCCESS_EVENT,
  RISK_SCORE_EXECUTION_ERROR_EVENT,
  RISK_SCORE_EXECUTION_CANCELLATION_EVENT,
} from '../../../telemetry/event_based/events';
import {
  AssetCriticalityDataClient,
  assetCriticalityServiceFactory,
} from '../../asset_criticality';
import type { EntityAnalyticsConfig, EntityAnalyticsRoutesDeps } from '../../types';

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
  auditLogger,
  taskManager,
  telemetry,
  entityAnalyticsConfig,
}: {
  getStartServices: EntityAnalyticsRoutesDeps['getStartServices'];
  kibanaVersion: string;
  logger: Logger;
  auditLogger: AuditLogger | undefined;
  taskManager: TaskManagerSetupContract | undefined;
  telemetry: AnalyticsServiceSetup;
  entityAnalyticsConfig: EntityAnalyticsConfig;
}): void => {
  if (!taskManager) {
    logger.info('Task Manager is unavailable; skipping risk engine task registration.');
    return;
  }

  const getRiskScoreService: GetRiskScoreService = (namespace) =>
    getStartServices().then(([coreStart, _]) => {
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const soClient = buildScopedInternalSavedObjectsClientUnsafe({ coreStart, namespace });

      const assetCriticalityDataClient = new AssetCriticalityDataClient({
        esClient,
        logger,
        auditLogger,
        namespace,
      });

      const assetCriticalityService = assetCriticalityServiceFactory({
        assetCriticalityDataClient,
        uiSettingsClient: coreStart.uiSettings.asScopedToClient(soClient),
      });

      const riskEngineDataClient = new RiskEngineDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
        auditLogger,
      });
      const riskScoreDataClient = new RiskScoreDataClient({
        logger,
        kibanaVersion,
        esClient,
        namespace,
        soClient,
        auditLogger,
      });

      return riskScoreServiceFactory({
        assetCriticalityService,
        esClient,
        logger,
        riskEngineDataClient,
        riskScoreDataClient,
        spaceId: namespace,
      });
    });

  taskManager.registerTaskDefinitions({
    [getTaskName()]: {
      title: 'Entity Analytics Risk Engine - Risk Scoring Task',
      timeout: TIMEOUT,
      stateSchemaByVersion,
      createTaskRunner: createTaskRunnerFactory({
        logger,
        getRiskScoreService,
        telemetry,
        entityAnalyticsConfig,
      }),
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
  isCancelled,
  logger,
  taskInstance,
  telemetry,
  entityAnalyticsConfig,
}: {
  logger: Logger;
  isCancelled: () => boolean;
  getRiskScoreService: GetRiskScoreService;
  taskInstance: ConcreteTaskInstance;
  telemetry: AnalyticsServiceSetup;
  entityAnalyticsConfig: EntityAnalyticsConfig;
}): Promise<{
  state: RiskScoringTaskState;
}> => {
  const state = taskInstance.state as RiskScoringTaskState;
  const taskId = taskInstance.id;
  const log = logFactory(logger, taskId);
  try {
    const taskStartTime = moment().utc().toISOString();
    log('running task');

    let scoresWritten = 0;
    const updatedState = {
      lastExecutionTimestamp: taskStartTime,
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

    const configuration = await riskScoreService.getConfigurationWithDefaults(
      entityAnalyticsConfig
    );
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
      alertSampleSizePerShard,
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

    const runs: Array<{
      identifierType: IdentifierType;
      scoresWritten: number;
      tookMs: number;
    }> = [];

    await asyncForEach(identifierTypes, async (identifierType) => {
      let isWorkComplete = isCancelled();
      let afterKeys: AfterKeys = {};
      while (!isWorkComplete) {
        const now = Date.now();
        const result = await riskScoreService.calculateAndPersistScores({
          afterKeys,
          index,
          filter,
          identifierType,
          pageSize,
          range,
          runtimeMappings,
          weights: [],
          alertSampleSizePerShard,
        });
        const tookMs = Date.now() - now;

        runs.push({
          identifierType,
          scoresWritten: result.scores_written,
          tookMs,
        });

        isWorkComplete = isRiskScoreCalculationComplete(result) || isCancelled();
        afterKeys = result.after_keys;
        scoresWritten += result.scores_written;
      }
    });

    updatedState.scoresWritten = scoresWritten;

    const taskCompletionTime = moment().utc().toISOString();
    const taskDurationInSeconds = moment(taskCompletionTime).diff(moment(taskStartTime), 'seconds');
    const telemetryEvent = {
      scoresWritten,
      taskDurationInSeconds,
      interval: taskInstance?.schedule?.interval,
      alertSampleSizePerShard,
    };
    telemetry.reportEvent(RISK_SCORE_EXECUTION_SUCCESS_EVENT.eventType, telemetryEvent);

    if (isCancelled()) {
      log('task was cancelled');
      telemetry.reportEvent(RISK_SCORE_EXECUTION_CANCELLATION_EVENT.eventType, telemetryEvent);
    }

    if (scoresWritten > 0) {
      log('refreshing risk score index and scheduling transform');
      await riskScoreService.refreshRiskScoreIndex();
      await riskScoreService.scheduleLatestTransformNow();
    }

    log('task run completed');
    log(JSON.stringify({ ...telemetryEvent, runs }));

    return {
      state: updatedState,
    };
  } catch (e) {
    telemetry.reportEvent(RISK_SCORE_EXECUTION_ERROR_EVENT.eventType, {});
    throw e;
  }
};

const createTaskRunnerFactory =
  ({
    logger,
    getRiskScoreService,
    telemetry,
    entityAnalyticsConfig,
  }: {
    logger: Logger;
    getRiskScoreService: GetRiskScoreService;
    telemetry: AnalyticsServiceSetup;
    entityAnalyticsConfig: EntityAnalyticsConfig;
  }) =>
  ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
    let cancelled = false;
    const isCancelled = () => cancelled;
    return {
      run: async () =>
        runTask({
          getRiskScoreService,
          isCancelled,
          logger,
          taskInstance,
          telemetry,
          entityAnalyticsConfig,
        }),
      cancel: async () => {
        cancelled = true;
      },
    };
  };
