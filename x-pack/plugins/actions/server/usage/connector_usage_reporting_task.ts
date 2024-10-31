/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import { Logger, CoreSetup, type ElasticsearchClient } from '@kbn/core/server';
import {
  IntervalSchedule,
  type ConcreteTaskInstance,
  TaskManagerStartContract,
  TaskManagerSetupContract,
} from '@kbn/task-manager-plugin/server';
import { AggregationsSumAggregate } from '@elastic/elasticsearch/lib/api/types';
import axios from 'axios';
import https from 'https';
import { ActionsConfig } from '../config';
import { ConnectorUsageReport } from './types';
import { ActionsPluginsStart } from '../plugin';

export const CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE: IntervalSchedule = { interval: '1h' };
export const CONNECTOR_USAGE_REPORTING_TASK_ID = 'connector_usage_reporting';
export const CONNECTOR_USAGE_REPORTING_TASK_TYPE = `actions:${CONNECTOR_USAGE_REPORTING_TASK_ID}`;
export const CONNECTOR_USAGE_REPORTING_TASK_TIMEOUT = 30000;
export const CONNECTOR_USAGE_TYPE = `connector_request_body_bytes`;
export const CONNECTOR_USAGE_REPORTING_SOURCE_ID = `task-connector-usage-report`;
export const MAX_PUSH_ATTEMPTS = 5;

export class ConnectorUsageReportingTask {
  private readonly logger: Logger;
  private readonly eventLogIndex: string;
  private readonly projectId: string | undefined;
  private readonly caCertificate: string | undefined;
  private readonly usageApiUrl: string;

  constructor({
    logger,
    eventLogIndex,
    core,
    taskManager,
    projectId,
    config,
  }: {
    logger: Logger;
    eventLogIndex: string;
    core: CoreSetup<ActionsPluginsStart>;
    taskManager: TaskManagerSetupContract;
    projectId: string | undefined;
    config: ActionsConfig['usage'];
  }) {
    this.logger = logger;
    this.projectId = projectId;
    this.eventLogIndex = eventLogIndex;
    this.usageApiUrl = config.url;
    const caCertificatePath = config.ca?.path;

    if (caCertificatePath && caCertificatePath.length > 0) {
      try {
        this.caCertificate = fs.readFileSync(caCertificatePath, 'utf8');
      } catch (e) {
        this.caCertificate = undefined;
        this.logger.error(
          `CA Certificate for the project "${projectId}" couldn't be loaded, Error: ${e.message}`
        );
      }
    }

    taskManager.registerTaskDefinitions({
      [CONNECTOR_USAGE_REPORTING_TASK_TYPE]: {
        title: 'Connector usage reporting task',
        timeout: '1m',
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => this.runTask(taskInstance, core),
            cancel: async () => {},
          };
        },
      },
    });
  }

  public start = async (taskManager?: TaskManagerStartContract) => {
    if (!taskManager) {
      this.logger.error(
        `Missing required task manager service during start of ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}`
      );
      return;
    }

    try {
      await taskManager.ensureScheduled({
        id: CONNECTOR_USAGE_REPORTING_TASK_ID,
        taskType: CONNECTOR_USAGE_REPORTING_TASK_TYPE,
        schedule: {
          ...CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE,
        },
        state: {},
        params: {},
      });
    } catch (e) {
      this.logger.error(
        `Error scheduling task ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}, received ${e.message}`
      );
    }
  };

  private runTask = async (taskInstance: ConcreteTaskInstance, core: CoreSetup) => {
    const { state } = taskInstance;

    if (!this.projectId) {
      this.logger.warn(
        `Missing required project id while running ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}`
      );
      return {
        state,
      };
    }

    if (!this.caCertificate) {
      this.logger.error(
        `Missing required CA Certificate while running ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}`
      );
      return {
        state,
      };
    }

    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;

    const now = new Date();
    const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    const lastReportedUsageDate: Date = !!state.lastReportedUsageDate
      ? new Date(state.lastReportedUsageDate)
      : oneDayAgo;

    let attempts: number = state.attempts || 0;

    const fromDate = lastReportedUsageDate;
    const toDate = now;

    let totalUsage = 0;
    try {
      totalUsage = await this.getTotalUsage({
        esClient,
        fromDate,
        toDate,
      });
    } catch (e) {
      this.logger.error(`Usage data could not be fetched. It will be retried. Error:${e.message}`);
      return {
        state: {
          lastReportedUsageDate,
          attempts,
        },
        runAt: now,
      };
    }

    const record: ConnectorUsageReport = this.createUsageRecord({
      totalUsage,
      fromDate,
      toDate,
      projectId: this.projectId,
    });

    this.logger.debug(`Record: ${JSON.stringify(record)}`);

    try {
      attempts = attempts + 1;
      await this.pushUsageRecord(record);
      this.logger.info(
        `Connector usage record has been successfully reported, ${record.creation_timestamp}, usage: ${record.usage.quantity}, period:${record.usage.period_seconds}`
      );
    } catch (e) {
      if (attempts < MAX_PUSH_ATTEMPTS) {
        this.logger.error(
          `Usage data could not be pushed to usage-api. It will be retried (${attempts}). Error:${e.message}`
        );

        return {
          state: {
            lastReportedUsageDate,
            attempts,
          },
          runAt: this.getDelayedRetryDate({ attempts, now }),
        };
      }
      this.logger.error(
        `Usage data could not be pushed to usage-api. Stopped retrying after ${attempts} attempts. Error:${e.message}`
      );
      return {
        state: {
          lastReportedUsageDate,
          attempts: 0,
        },
      };
    }

    return {
      state: { lastReportedUsageDate: toDate, attempts: 0 },
    };
  };

  private getTotalUsage = async ({
    esClient,
    fromDate,
    toDate,
  }: {
    esClient: ElasticsearchClient;
    fromDate: Date;
    toDate: Date;
  }): Promise<number> => {
    const usageResult = await esClient.search({
      index: this.eventLogIndex,
      sort: '@timestamp',
      size: 0,
      query: {
        bool: {
          filter: {
            bool: {
              must: [
                {
                  term: { 'event.action': 'execute' },
                },
                {
                  term: { 'event.provider': 'actions' },
                },
                {
                  exists: {
                    field: 'kibana.action.execution.usage.request_body_bytes',
                  },
                },
                {
                  range: {
                    '@timestamp': {
                      gt: fromDate,
                      lte: toDate,
                    },
                  },
                },
              ],
            },
          },
        },
      },
      aggs: {
        total_usage: { sum: { field: 'kibana.action.execution.usage.request_body_bytes' } },
      },
    });

    return (usageResult.aggregations?.total_usage as AggregationsSumAggregate)?.value ?? 0;
  };

  private createUsageRecord = ({
    totalUsage,
    fromDate,
    toDate,
    projectId,
  }: {
    totalUsage: number;
    fromDate: Date;
    toDate: Date;
    projectId: string;
  }): ConnectorUsageReport => {
    const period = Math.round((toDate.getTime() - fromDate.getTime()) / 1000);
    const toStr = toDate.toISOString();
    const timestamp = new Date(toStr);
    timestamp.setMinutes(0);
    timestamp.setSeconds(0);
    timestamp.setMilliseconds(0);

    return {
      id: `connector-request-body-bytes-${projectId}-${timestamp.toISOString()}`,
      usage_timestamp: toStr,
      creation_timestamp: toStr,
      usage: {
        type: CONNECTOR_USAGE_TYPE,
        period_seconds: period,
        quantity: totalUsage,
      },
      source: {
        id: CONNECTOR_USAGE_REPORTING_SOURCE_ID,
        instance_group_id: projectId,
      },
    };
  };

  private pushUsageRecord = async (record: ConnectorUsageReport) => {
    return axios.post(this.usageApiUrl, [record], {
      headers: { 'Content-Type': 'application/json' },
      timeout: CONNECTOR_USAGE_REPORTING_TASK_TIMEOUT,
      httpsAgent: new https.Agent({
        ca: this.caCertificate,
      }),
    });
  };

  private getDelayedRetryDate = ({ attempts, now }: { attempts: number; now: Date }) => {
    const baseDelay = 60 * 1000;
    const delayByAttempts = baseDelay * attempts;

    const delayedTime = now.getTime() + delayByAttempts;

    return new Date(delayedTime);
  };
}
