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
import type { ITelemetryReceiver } from './receiver';
import type { ITelemetryEventsSender } from './sender';
import type { ITaskMetricsService } from './task_metrics.types';
import { tlog } from './helpers';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';

export interface SecurityTelemetryTaskConfig {
  type: string;
  title: string;
  interval: string;
  timeout: string;
  version: string;
  getLastExecutionTime?: LastExecutionTimestampCalculator;
  runTask: SecurityTelemetryTaskRunner;
}

export type SecurityTelemetryTaskRunner = (
  taskId: string,
  logger: Logger,
  receiver: ITelemetryReceiver,
  sender: ITelemetryEventsSender,
  taskMetricsService: ITaskMetricsService,
  taskExecutionPeriod: TaskExecutionPeriod
) => Promise<number>;

export interface TaskExecutionPeriod {
  last?: string;
  current: string;
}

export type LastExecutionTimestampCalculator = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => string;

export class SecurityTelemetryTask {
  private readonly config: SecurityTelemetryTaskConfig;
  private readonly logger: Logger;
  private readonly sender: ITelemetryEventsSender;
  private readonly receiver: ITelemetryReceiver;
  private readonly taskMetricsService: ITaskMetricsService;

  constructor(
    config: SecurityTelemetryTaskConfig,
    logger: Logger,
    sender: ITelemetryEventsSender,
    receiver: ITelemetryReceiver,
    taskMetricsService: ITaskMetricsService
  ) {
    this.config = config;
    this.logger = logger;
    this.sender = sender;
    this.receiver = receiver;
    this.taskMetricsService = taskMetricsService;
  }

  public getLastExecutionTime = (
    taskExecutionTime: string,
    taskInstance: ConcreteTaskInstance
  ): string | undefined => {
    return this.config.getLastExecutionTime
      ? this.config.getLastExecutionTime(
          taskExecutionTime,
          taskInstance.state?.lastExecutionTimestamp
        )
      : undefined;
  };

  public getTaskId = (): string => {
    return `${this.config.type}:${this.config.version}`;
  };

  public register = (taskManager: TaskManagerSetupContract) => {
    taskManager.registerTaskDefinitions({
      [this.config.type]: {
        title: this.config.title,
        timeout: this.config.timeout,
        stateSchemaByVersion,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const state = taskInstance.state as LatestTaskStateSchema;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const executionPeriod = {
                last: this.getLastExecutionTime(taskExecutionTime, taskInstance),
                current: taskExecutionTime,
              };

              const hits = await this.runTask(taskInstance.id, executionPeriod);

              const updatedState: LatestTaskStateSchema = {
                lastExecutionTimestamp: taskExecutionTime,
                runs: state.runs + 1,
                hits,
              };

              return {
                state: updatedState,
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  };

  public start = async (taskManager: TaskManagerStartContract) => {
    const taskId = this.getTaskId();
    tlog(this.logger, `[task ${taskId}]: attempting to schedule`);
    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: this.config.type,
        scope: ['securitySolution'],
        schedule: {
          interval: this.config.interval,
        },
        state: emptyState,
        params: { version: this.config.version },
      });
    } catch (e) {
      this.logger.error(`[task ${taskId}]: error scheduling task, received ${e.message}`);
    }
  };

  public runTask = async (taskId: string, executionPeriod: TaskExecutionPeriod) => {
    tlog(this.logger, `[task ${taskId}]: attempting to run`);
    if (taskId !== this.getTaskId()) {
      tlog(this.logger, `[task ${taskId}]: outdated task`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      tlog(this.logger, `[task ${taskId}]: telemetry is not opted-in`);
      return 0;
    }

    const isTelemetryServicesReachable = await this.sender.isTelemetryServicesReachable();
    if (!isTelemetryServicesReachable) {
      tlog(this.logger, `[task ${taskId}]: cannot reach telemetry services`);
      return 0;
    }

    tlog(this.logger, `[task ${taskId}]: running task`);
    return this.config.runTask(
      taskId,
      this.logger,
      this.receiver,
      this.sender,
      this.taskMetricsService,
      executionPeriod
    );
  };
}
