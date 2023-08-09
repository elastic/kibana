/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { Logger } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';

import type { AfterKeys } from '../../../../common/risk_engine';
import type { RiskScoreService } from '../risk_score_service';
import {
  defaultState,
  stateSchemaByVersion,
  type LatestTaskStateSchema as RiskScoringTaskState,
} from './state';
import { INTERVAL, SCOPE, TIMEOUT, TYPE, VERSION } from './constants';
import { convertRangeToISO } from './helpers';
import { isRiskScoreCalculationComplete } from '../helpers';

// const register = (taskManager: TaskManagerSetupContract) => {};

export class RiskScoringTask {
  private readonly logger: Logger;

  constructor({ logger }: { logger: Logger }) {
    this.logger = logger;
  }

  private log = (message: string): void => {
    this.logger.info(`[task ${RiskScoringTask.getTaskId()}]: ${message}`);
  };

  static getTaskName = (): string => TYPE;

  static getTaskId = (): string => {
    // TODO does this need to account for the space?
    return `${TYPE}:${VERSION}`;
  };

  public register = (
    taskManager: TaskManagerSetupContract,
    logger: Logger,
    riskScoreService: Promise<RiskScoreService>
  ) => {
    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'Entity Analytics Risk Engine - Risk Scoring Task',
        timeout: TIMEOUT,
        stateSchemaByVersion,
        createTaskRunner: this.createCreateTaskRunner(logger, riskScoreService),
      },
    });
  };

  public start = async ({ taskManager }: { taskManager: TaskManagerStartContract }) => {
    const taskId = RiskScoringTask.getTaskId();

    // TODO get config and use it here
    this.log('attempting to schedule');
    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: defaultState,
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.warn(`[task ${taskId}]: error scheduling task, received ${e.message}`); // todo
    }
  };

  public runTask = async (
    logger: Logger,
    riskScoreService: RiskScoreService,
    taskInstance: ConcreteTaskInstance
  ): Promise<{
    state: RiskScoringTaskState;
    // TODO when do we need to return schedule?
  }> => {
    const state = taskInstance.state as RiskScoringTaskState;
    const taskId = taskInstance.id;

    this.log('attempting to run');
    const taskExecutionTime = moment().utc().toISOString();

    let afterKeys: AfterKeys = {};
    let scoresWritten = 0;
    const updatedState = {
      lastExecutionTimestamp: taskExecutionTime,
      runs: state.runs + 1,
      scoresWritten,
    };

    if (taskId !== RiskScoringTask.getTaskId()) {
      this.log('outdated task');
      return { state: updatedState };
    }

    if (!riskScoreService) {
      this.log('risk score service is not available; exiting task');
      return { state: updatedState };
    }

    const configuration = await riskScoreService.getConfiguration();
    if (configuration == null) {
      this.log(
        'risk engine configuration not found; exiting task. Please re-enable the risk engine and try again'
      );
      return { state: updatedState };
    }

    const { dataViewId, enabled, filter, range: configuredRange, pageSize } = configuration;
    if (!enabled) {
      this.log('risk engine is not enabled, exiting task');
      return { state: updatedState };
    }

    const range = convertRangeToISO(configuredRange);
    const { index, runtimeMappings } = await riskScoreService.getRiskInputsIndex({
      dataViewId,
    });

    let isWorkComplete = false;
    while (!isWorkComplete) {
      const result = await riskScoreService.calculateAndPersistScores({
        afterKeys,
        index,
        filter: undefined, // TODO default of {} breaks things
        identifierType: 'host', // TODO
        pageSize,
        range,
        runtimeMappings,
        weights: [],
      });

      isWorkComplete = isRiskScoreCalculationComplete(result);
      afterKeys = result.after_keys;
      scoresWritten += result.scores_written;
    }

    updatedState.scoresWritten = scoresWritten;

    return {
      state: updatedState,
    };
  };

  private createCreateTaskRunner =
    (logger: Logger, riskScoreService: Promise<RiskScoreService>) =>
    ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
      return {
        run: async () => this.runTask(logger, await riskScoreService, taskInstance),
        cancel: async () => {},
      };
    };
}
