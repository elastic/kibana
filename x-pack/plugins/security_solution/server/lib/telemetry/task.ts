/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { Logger } from 'src/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import { TelemetryEventsSender, TelemetryEvent } from './sender';

export const TelemetryDiagTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'security:endpoint-diagnostics',
  INTERVAL: '5m',
  VERSION: '1.0.0',
};

export class TelemetryDiagTask {
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
      [TelemetryDiagTaskConstants.TYPE]: {
        title: 'Security Solution Telemetry Diagnostics task',
        timeout: TelemetryDiagTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              const executeTo = moment().utc().toISOString();
              const executeFrom = this.getLastExecutionTimestamp(
                executeTo,
                taskInstance.state?.lastExecutionTimestamp
              );
              await this.runTask(taskInstance.id, executeFrom, executeTo);

              return {
                state: {
                  lastExecutionTimestamp: executeTo,
                },
              };
            },
            cancel: async () => {},
          };
        },
      },
    });
  }

  public getLastExecutionTimestamp(executeTo: string, lastExecutionTimestamp?: string) {
    if (lastExecutionTimestamp === undefined) {
      this.logger.debug(`No last execution timestamp defined`);
      return moment(executeTo).subtract(5, 'minutes').toISOString();
    }

    if (moment(executeTo).diff(lastExecutionTimestamp, 'minutes') >= 10) {
      this.logger.debug(`last execution timestamp was greater than 10 minutes`);
      return moment(executeTo).subtract(10, 'minutes').toISOString();
    }

    return lastExecutionTimestamp;
  }

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TelemetryDiagTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryDiagTaskConstants.INTERVAL,
        },
        state: {},
        params: { version: TelemetryDiagTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetryDiagTaskConstants.TYPE}:${TelemetryDiagTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string, searchFrom: string, searchTo: string) => {
    this.logger.debug(`Running task ${taskId}`);
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return;
    }

    const response = await this.sender.fetchDiagnosticAlerts(searchFrom, searchTo);

    const hits = response.hits?.hits || [];
    if (!Array.isArray(hits) || !hits.length) {
      this.logger.debug('no diagnostic alerts retrieved');
      return;
    }

    const diagAlerts: TelemetryEvent[] = hits.map((h) => h._source);
    this.logger.debug(`Received ${diagAlerts.length} diagnostic alerts`);
    this.sender.queueTelemetryEvents(diagAlerts);
  };
}
