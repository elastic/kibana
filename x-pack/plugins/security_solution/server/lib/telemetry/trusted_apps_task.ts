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

import { getPreviousEpMetaTaskTimestamp, batchTelemetryRecords } from './helpers';
import { TelemetryEventsSender } from './sender';

export const TelemetryTrustedAppsTaskConstants = {
  TIMEOUT: '1m',
  TYPE: 'security:trusted-apps-telemetry',
  INTERVAL: '24h',
  VERSION: '1.0.0',
};

/** Telemetry Trusted Apps Task
 *
 * The Trusted Apps task is a daily batch job that collects and transmits non-sensitive
 * trusted apps hashes + file paths for supported operating systems. This helps test
 * efficacy of our protections.
 */
export class TelemetryTrustedAppsTask {
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
      [TelemetryTrustedAppsTaskConstants.TYPE]: {
        title: 'Security Solution Telemetry Endpoint Metrics and Info task',
        timeout: TelemetryTrustedAppsTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const lastExecutionTimestamp = getPreviousEpMetaTaskTimestamp(
                taskExecutionTime,
                taskInstance.state?.lastExecutionTimestamp
              );

              const hits = await this.runTask(
                taskInstance.id,
                lastExecutionTimestamp,
                taskExecutionTime
              );

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

  public start = async (taskManager: TaskManagerStartContract) => {
    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TelemetryTrustedAppsTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetryTrustedAppsTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
        params: { version: TelemetryTrustedAppsTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetryTrustedAppsTaskConstants.TYPE}:${TelemetryTrustedAppsTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string, executeFrom: string, executeTo: string) => {
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    const response = await this.sender.fetchTrustedApplications();
    this.logger.debug(`Trusted Apps: ${response}`);

    batchTelemetryRecords(response.data, 1_000).forEach((telemetryBatch) =>
      this.sender.sendOnDemand('lists-trustedapps', telemetryBatch)
    );

    return response.data.length;
  };
}
