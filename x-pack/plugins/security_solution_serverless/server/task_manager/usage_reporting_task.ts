/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageReportingService } from '../common/services';

import type { Response } from 'node-fetch';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';
import type {
  MeteringCallback,
  SecurityMetadataTaskStartContract,
  SecurityUsageReportingTaskSetupContract,
} from '../types';

export const TASK_TYPE_PREFIX = 'serverless-security';
const SCOPE = ['serverlessSecurity'];
const TIMEOUT = '1m';

export const VERSION = '1.0.0';

export class SecurityUsageReportingTask {
  private wasStarted: boolean = false;
  private cloudSetup: CloudSetup;
  private taskType: string;
  private taskId: string;
  private version: string;
  private logger: Logger;

  constructor(setupContract: SecurityUsageReportingTaskSetupContract) {
    const {
      core,
      logFactory,
      taskManager,
      cloudSetup,
      taskType,
      taskTitle,
      version,
      meteringCallback,
    } = setupContract;

    this.cloudSetup = cloudSetup;
    this.taskType = taskType;
    this.version = version;
    this.taskId = this.getTaskId(taskType, version);
    this.logger = logFactory.get(this.taskId);

    try {
      taskManager.registerTaskDefinitions({
        [taskType]: {
          title: taskTitle,
          timeout: TIMEOUT,
          createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
            return {
              run: async () => {
                return this.runTask(taskInstance, core, meteringCallback);
              },
              // TODO
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

  public start = async ({ taskManager, interval }: SecurityMetadataTaskStartContract) => {
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
        state: {
          lastSuccessfulReport: null,
        },
        params: { version: this.version },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private runTask = async (
    taskInstance: ConcreteTaskInstance,
    core: CoreSetup,
    meteringCallback: MeteringCallback
  ) => {
    // if task was not `.start()`'d yet, then exit
    if (!this.wasStarted) {
      return;
    }
    // Check that this task is current
    if (taskInstance.id !== this.taskId) {
      // old task, die
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    const lastSuccessfulReport = taskInstance.state.lastSuccessfulReport;

    const usageRecords = await meteringCallback({
      esClient,
      cloudSetup: this.cloudSetup,
      logger: this.logger,
      taskId: this.taskId,
      lastSuccessfulReport,
    });
    this.logger.info(`received usage records: ${JSON.stringify(usageRecords)}`);

    let usageReportResponse: Response | undefined;

    try {
      usageReportResponse = await usageReportingService.reportUsage(usageRecords);
      this.logger.info(`usage records report was sent successfully`);
    } catch (err) {
      this.logger.error(`Failed to send usage records report ${JSON.stringify(err)} `);
    }
    const state = {
      lastSuccessfulReport:
        usageReportResponse?.status === 201 ? new Date() : taskInstance.state.lastSuccessfulReport,
    };
    return { state };
  };

  private getTaskId = (taskType: string, version: string): string => {
    return `${taskType}:${version}`;
  };
}
