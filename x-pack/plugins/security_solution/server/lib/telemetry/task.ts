/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { TelemetryReceiver } from './receiver';
import { TelemetryEventsSender } from './sender';

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
  receiver: TelemetryReceiver,
  taskExecutionPeriod?: TaskExecutionPeriod
) => Promise<number>;

export interface TaskExecutionPeriod {
  last: string;
  current: string;
}

export type LastExecutionTimestampCalculator = (
  executeTo: string,
  lastExecutionTimestamp?: string
) => string;

export class SecurityTelemetryTask {
  private readonly config: SecurityTelemetryTaskConfig;
  private readonly logger: Logger;
  private readonly sender: TelemetryEventsSender;
  private readonly receiver: TelemetryReceiver;

  constructor(
    config: SecurityTelemetryTaskConfig,
    logger: Logger,
    taskManager: TaskManagerSetupContract,
    sender: TelemetryEventsSender,
    receiver: TelemetryReceiver
  ) {
    this.config = config;
    this.logger = logger;
    this.sender = sender;
    this.receiver = receiver;

    taskManager.registerTaskDefinitions({
      [this.config.type]: {
        title: this.config.title,
        timeout: this.config.timeout,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const executionPeriod = this.config.getLastExecutionTime
                ? {
                    last: this.config.getLastExecutionTime(
                      taskExecutionTime,
                      taskInstance.state?.lastExecutionTimestamp
                    ),
                    current: taskExecutionTime,
                  }
                : undefined;

              const hits = await this.runTask(taskInstance.id, executionPeriod);

              return {
                state: {
                  lastExecutionTimestamp: taskExecutionTime,
                  runs: (state.runs || 0) + 1,
                  hits,
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  private getTaskId = (): string => {
    return `${this.config.type}:${this.config.version}`;
  };

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: this.config.type,
        scope: ['securitySolution'],
        schedule: {
          interval: this.config.interval,
        },
        state: { runs: 0 },
        params: { version: this.config.version },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private runTask = async (taskId: string, executionPeriod?: TaskExecutionPeriod) => {
    this.logger.debug(`Running task ${taskId}`);
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    return this.config.runTask(taskId, this.receiver, executionPeriod);
  };
}
