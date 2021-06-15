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
import { getLastTaskExecutionTimestamp } from './helpers';
import { TelemetryEventsSender } from './sender';

export const TelemetryEndpointTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'security:endpoint-metrics',
  INTERVAL: '24h',
  VERSION: '1.0.0',
};

export class TelemetryEndpointTask {
  private readonly logger: Logger;
  private readonly sender: TelemetryEventsSender;

  constructor(
    logger: Logger,
    taskManager: TaskManagerSetupContract,
    sender: TelemetryEventsSender
  ) {
    this.logger = logger;
    this.sender = sender;

    taskManager.registerTaskDefinitions({
      [TelemetryEndpointTaskConstants.TYPE]: {
        title: 'Security Solution Telemetry Endpoint Metrics and Info task',
        timeout: TelemetryEndpointTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const executeTo = moment().utc().toISOString();
              const executeFrom = getLastTaskExecutionTimestamp(
                executeTo,
                taskInstance.state?.lastExecutionTimestamp
              );

              const _hits = await this.runTask(taskInstance.id, executeFrom, executeTo);

              return {
                state: {
                  lastExecutionTimestamp: executeTo,
                  runs: (state.runs || 0) + 1,
                  // TODO:@pjhampton - add debuging state for dev
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TelemetryEndpointTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryEndpointTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
        params: { version: TelemetryEndpointTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetryEndpointTaskConstants.TYPE}:${TelemetryEndpointTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string, searchFrom: string, searchTo: string) => {
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

    // TODO:@pjhampton - I do stuff
    this.logger.debug(`this is where I get the data`);

    return 0; // hits
  };
}
