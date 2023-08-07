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
import type { TelemetryReceiver } from './receiver';
import type { TelemetryEventsSender } from './sender';
import { type LatestTaskStateSchema, stateSchemaByVersion } from './task_state';

export interface OsqueryTelemetryTaskConfig {
  type: string;
  title: string;
  interval: string;
  timeout: string;
  version: string;
  getLastExecutionTime?: LastExecutionTimestampCalculator;
  runTask: OsqueryTelemetryTaskRunner;
}

export type OsqueryTelemetryTaskRunner = (
  taskId: string,
  logger: Logger,
  receiver: TelemetryReceiver,
  sender: TelemetryEventsSender,
  taskExecutionPeriod: TaskExecutionPeriod
) => Promise<void>;

export interface TaskExecutionPeriod {
  last?: string;
  current: string;
}

export type LastExecutionTimestampCalculator = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => string;

export class OsqueryTelemetryTask {
  private readonly config: OsqueryTelemetryTaskConfig;
  private readonly logger: Logger;
  private readonly sender: TelemetryEventsSender;
  private readonly receiver: TelemetryReceiver;

  constructor(
    config: OsqueryTelemetryTaskConfig,
    logger: Logger,
    sender: TelemetryEventsSender,
    receiver: TelemetryReceiver
  ) {
    this.config = config;
    this.logger = logger;
    this.sender = sender;
    this.receiver = receiver;
  }

  public getLastExecutionTime = (
    taskExecutionTime: string,
    taskInstance: ConcreteTaskInstance
  ): string | undefined =>
    this.config.getLastExecutionTime
      ? this.config.getLastExecutionTime(
          taskExecutionTime,
          taskInstance.state?.lastExecutionTimestamp
        )
      : undefined;

  public getTaskId = (): string => `${this.config.type}:${this.config.version}`;

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
                hits: typeof hits === 'number' ? hits : undefined,
              };

              return {
                state: updatedState,
              };
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            cancel: async () => {},
          };
        },
      },
    });
  };

  public start = async (taskManager: TaskManagerStartContract) => {
    const taskId = this.getTaskId();
    this.logger.debug(`[task ${taskId}]: attempting to schedule`);
    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: this.config.type,
        scope: ['osquery'],
        schedule: {
          interval: this.config.interval,
        },
        state: { runs: 0 },
        params: { version: this.config.version },
      });
    } catch (e) {
      this.logger.error(`[task ${taskId}]: error scheduling task, received ${e.message}`);
    }
  };

  public runTask = async (taskId: string, executionPeriod: TaskExecutionPeriod) => {
    this.logger.debug(`[task ${taskId}]: attempting to run`);
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`[task ${taskId}]: outdated task`);

      return 0;
    }

    this.logger.debug(`[task ${taskId}]: running task`);

    return this.config.runTask(taskId, this.logger, this.receiver, this.sender, executionPeriod);
  };
}
