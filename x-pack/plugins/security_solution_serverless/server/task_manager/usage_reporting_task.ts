/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Response } from 'node-fetch';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';

import { usageReportingService } from '../common/services';
import type {
  MeteringCallback,
  SecurityUsageReportingTaskStartContract,
  SecurityUsageReportingTaskSetupContract,
  UsageRecord,
} from '../types';
import type { ServerlessSecurityConfig } from '../config';

import { stateSchemaByVersion, emptyState } from './task_state';

const SCOPE = ['serverlessSecurity'];
const TIMEOUT = '1m';

export const VERSION = '1.0.0';

export class SecurityUsageReportingTask {
  private wasStarted: boolean = false;
  private cloudSetup: CloudSetup;
  private taskType: string;
  private version: string;
  private logger: Logger;
  private abortController = new AbortController();
  private config: ServerlessSecurityConfig;

  constructor(setupContract: SecurityUsageReportingTaskSetupContract) {
    const {
      core,
      logFactory,
      config,
      taskManager,
      cloudSetup,
      taskType,
      taskTitle,
      version,
      meteringCallback,
      options,
    } = setupContract;

    this.cloudSetup = cloudSetup;
    this.taskType = taskType;
    this.version = version;
    this.logger = logFactory.get(this.taskId);
    this.config = config;

    try {
      taskManager.registerTaskDefinitions({
        [taskType]: {
          title: taskTitle,
          timeout: TIMEOUT,
          stateSchemaByVersion,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
            return {
              run: async () => {
                return this.runTask(
                  taskInstance,
                  core,
                  meteringCallback,
                  options?.lookBackLimitMinutes
                );
              },
              cancel: async () => {},
            };
          },
        },
      });
      this.logger.info(`Scheduled task successfully ${taskTitle}`);
    } catch (err) {
      this.logger.error(`Failed to setup task ${taskType}, ${err} `);
    }
  }

  public start = async ({ taskManager, interval }: SecurityUsageReportingTaskStartContract) => {
    if (!taskManager) {
      return;
    }

    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.taskId,
        taskType: this.taskType,
        scope: SCOPE,
        schedule: {
          interval,
        },
        state: emptyState,
        params: { version: this.version },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task ${this.taskType}, received ${e.message}`);
    }
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    meteringCallback: MeteringCallback,
    lookBackLimitMinutes?: number
  ) => {
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      // old task, die
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    const lastSuccessfulReport =
      taskInstance.state.lastSuccessfulReport && new Date(taskInstance.state.lastSuccessfulReport);

    let usageRecords: UsageRecord[] = [];
    // save usage record query time so we can use it to know where
    // the next query range should start
    const meteringCallbackTime = new Date();
    try {
      usageRecords = await meteringCallback({
        esClient,
        cloudSetup: this.cloudSetup,
        logger: this.logger,
        taskId: this.taskId,
        lastSuccessfulReport,
        abortController: this.abortController,
        config: this.config,
      });
    } catch (err) {
      this.logger.error(`failed to retrieve usage records: ${err}`);
      return;
    }

    this.logger.debug(`received usage records: ${JSON.stringify(usageRecords)}`);

    let usageReportResponse: Response | undefined;

    if (usageRecords.length !== 0) {
      try {
        usageReportResponse = await usageReportingService.reportUsage(usageRecords);

        if (!usageReportResponse.ok) {
          const errorResponse = await usageReportResponse.json();
          this.logger.error(`API error ${usageReportResponse.status}, ${errorResponse}`);
          return;
        }

        this.logger.info(
          `usage records report was sent successfully: ${usageReportResponse.status}, ${usageReportResponse.statusText}`
        );
      } catch (err) {
        this.logger.error(`Failed to send usage records report ${err} `);
      }
    }

    const state = {
      lastSuccessfulReport: this.shouldUpdateLastSuccessfulReport(usageRecords, usageReportResponse)
        ? meteringCallbackTime.toISOString()
        : this.getFailedLastSuccessfulReportTime(
            meteringCallbackTime,
            lastSuccessfulReport,
            lookBackLimitMinutes
          ).toISOString(),
    };
    return { state };
  };

  private getFailedLastSuccessfulReportTime(
    meteringCallbackTime: Date,
    lastSuccessfulReport: Date,
    lookBackLimitMinutes?: number
  ): Date {
    const nextLastSuccessfulReport = lastSuccessfulReport || meteringCallbackTime;

    if (!lookBackLimitMinutes) {
      return nextLastSuccessfulReport;
    }

    const lookBackLimitTime = new Date(meteringCallbackTime.setMinutes(-lookBackLimitMinutes));

    if (nextLastSuccessfulReport > lookBackLimitTime) {
      return nextLastSuccessfulReport;
    }

    this.logger.error(
      `lastSuccessfulReport time of ${nextLastSuccessfulReport.toISOString()} is past the limit of ${lookBackLimitMinutes} minutes, adjusting lastSuccessfulReport to ${lookBackLimitTime.toISOString()}`
    );
    return lookBackLimitTime;
  }

  private shouldUpdateLastSuccessfulReport(
    usageRecords: UsageRecord[],
    usageReportResponse: Response | undefined
  ): boolean {
    return !usageRecords.length || usageReportResponse?.status === 201;
  }

  private get taskId() {
    return `${this.taskType}:${this.version}`;
  }
}
