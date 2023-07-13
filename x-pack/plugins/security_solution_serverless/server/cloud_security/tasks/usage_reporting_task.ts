/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'node-fetch';

import type { CoreSetup, ElasticsearchClient, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';

import type { UsageRecord } from '../../types';
import { securityUsageReportingService } from '../services/usage_reporting_service';

const SCOPE = ['serverlessSecurity'];
// const INTERVAL = '5m';
const TIMEOUT = '1m';
export const TYPE = 'serverless-security:endpoint-usage-reporting-task';
export const VERSION = '1.0.0';

// 1 hour
// const SAMPLE_PERIOD_SECONDS = 3600;

type MeteringCallback = (metringCallbackInput: MeteringCallbackInput) => UsageRecord[];

export interface MeteringCallbackInput {
  esClient: ElasticsearchClient;
  lastSuccessfulReport: Date;
}

export interface CloudSecurityUsageReportingTaskSetupContract {
  taskTitle: string;
  meteringCallback: MeteringCallback;
  logFactory: LoggerFactory;
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
}

export interface SecurityMetadataTaskStartContract {
  taskType: string;
  interval: string;
  version: string;
  taskManager: TaskManagerStartContract;
}

export class SecurityUsageReportingTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: CloudSecurityUsageReportingTaskSetupContract) {
    const { taskTitle, logFactory, core, taskManager, meteringCallback } = setupContract;

    this.logger = logFactory.get(this.getTaskId());
    taskManager.registerTaskDefinitions({
      [TYPE]: {
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
  }

  public start = async ({
    taskManager,
    taskType,
    interval,
    version,
  }: SecurityMetadataTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('missing required service during start');
      return;
    }

    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType,
        scope: SCOPE,
        schedule: {
          interval,
        },
        state: {
          lastSuccessfulReport: null,
        },
        params: { version },
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
      this.logger.debug('[runTask()] Aborted. Task not started yet');
      return;
    }

    // Check that this task is current
    if (taskInstance.id !== this.getTaskId()) {
      // old task, die
      throwUnrecoverableError(new Error('Outdated task version'));
    }

    const [{ elasticsearch }] = await core.getStartServices();

    const esClient = elasticsearch.client.asInternalUser;
    const lastSuccessfulReport = taskInstance.state.lastSuccessfulReport;

    const usageRecords = meteringCallback({ esClient, lastSuccessfulReport });

    let usageReportResponse: Response | undefined;

    try {
      usageReportResponse = await securityUsageReportingService.reportUsage(usageRecords);
    } catch (e) {
      this.logger.warn(JSON.stringify(e));
    }
    const state = {
      lastSuccessfulReport:
        usageReportResponse?.status === 201 ? new Date() : taskInstance.state.lastSuccessfulReport,
    };
    return { state };
  };

  private getTaskId = (): string => {
    return `${TYPE}:${VERSION}`;
  };
}
