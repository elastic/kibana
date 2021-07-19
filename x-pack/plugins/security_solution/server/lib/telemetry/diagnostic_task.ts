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
          const { state } = taskInstance;

          return {
            run: async () => {
              const executeTo = moment().utc().toISOString();
              const executeFrom = getLastTaskExecutionTimestamp(
                executeTo,
                taskInstance.state?.lastExecutionTimestamp
              );
              const hits = await this.runTask(taskInstance.id, executeFrom, executeTo);

              return {
                state: {
                  lastExecutionTimestamp: executeTo,
                  lastDiagAlertCount: hits,
                  runs: (state.runs || 0) + 1,
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
        taskType: TelemetryDiagTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryDiagTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
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
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    const response = await this.sender.fetchDiagnosticAlerts(searchFrom, searchTo);

    const hits = response.hits?.hits || [];
    if (!Array.isArray(hits) || !hits.length) {
      this.logger.debug('no diagnostic alerts retrieved');
      return 0;
    }
    this.logger.debug(`Received ${hits.length} diagnostic alerts`);

    const diagAlerts: TelemetryEvent[] = hits.map((h) => h._source);
    this.sender.queueTelemetryEvents(diagAlerts);
    return diagAlerts.length;
  };
}
