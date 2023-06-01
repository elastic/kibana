/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Response } from 'node-fetch';

import type { CoreSetup, Logger, LoggerFactory } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { throwUnrecoverableError } from '@kbn/task-manager-plugin/server';

import type { UsageRecord } from '../../types';
import { endpointHeartbeatService, endpointUsageReportingService } from '../services';

const SCOPE = ['serverlessSecurity'];
const INTERVAL = '5m';
const TIMEOUT = '1m';
export const TYPE = 'serverless-security:endpoint-usage-reporting-task';
export const VERSION = '1.0.0';

// 1 hour
const SAMPLE_PERIOD_SECONDS = 3600;

export interface EndpointUsageReportingTaskSetupContract {
  logFactory: LoggerFactory;
  core: CoreSetup;
  taskManager: TaskManagerSetupContract;
}

export interface CheckMetadataTransformsTaskStartContract {
  taskManager: TaskManagerStartContract;
}

export class EndpointUsageReportingTask {
  private logger: Logger;
  private wasStarted: boolean = false;

  constructor(setupContract: EndpointUsageReportingTaskSetupContract) {
    const { logFactory, core, taskManager } = setupContract;

    this.logger = logFactory.get(this.getTaskId());
    taskManager.registerTaskDefinitions({
      [TYPE]: {
        title: 'Security Solution Endpoint Metadata Periodic Tasks',
        timeout: TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask(taskInstance, core);
            },
            // TODO
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async ({ taskManager }: CheckMetadataTransformsTaskStartContract) => {
    if (!taskManager) {
      this.logger.error('missing required service during start');
      return;
    }

    this.wasStarted = true;

    try {
      await taskManager.ensureScheduled({
        id: this.getTaskId(),
        taskType: TYPE,
        scope: SCOPE,
        schedule: {
          interval: INTERVAL,
        },
        state: {
          lastSuccessfulReport: null,
        },
        params: { version: VERSION },
      });
    } catch (e) {
      this.logger.debug(`Error scheduling task, received ${e.message}`);
    }
  };

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
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
    const heartbeatsResponse = await endpointHeartbeatService.getHeartbeatsSince(
      elasticsearch.client.asInternalUser,
      taskInstance.state.lastSuccessfulReport
    );

    const usageRecords = heartbeatsResponse.hits.hits.reduce((acc, { _source }) => {
      if (!_source) {
        return acc;
      }
      const { agent, event } = _source;
      const agentId = agent.id;
      const timestamp = event.ingested;
      const hourTs = new Date(timestamp);
      hourTs.setMinutes(0);
      hourTs.setSeconds(0);
      hourTs.setMilliseconds(0);
      const record: UsageRecord = {
        id: `endpoint-${agentId}-${hourTs}`,
        usage_timestamp: timestamp,
        creation_timestamp: timestamp,
        usage: {
          type: 'security_solution_endpoint',
          sub_type: 'complete',
          period_seconds: SAMPLE_PERIOD_SECONDS,
          quantity: 1,
        },
        source: {
          id: 'endpoint-id-123',
          instance_group_id: 'id-123',
          instance_group_type: 'serverless_project',
        },
      };

      return [...acc, record];
    }, [] as UsageRecord[]);

    let usageReportResponse: Response | undefined;
    try {
      usageReportResponse = await endpointUsageReportingService.reportUsage(usageRecords);
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
