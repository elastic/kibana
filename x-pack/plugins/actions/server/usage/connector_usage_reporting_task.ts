/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { ConnectorUsageReport } from './types';
import { ActionsPluginsStart } from '../plugin';

export const USAGE_API_URL = 'https://usage-api.elastic-system/api/v1/usage`';
export const CONNECTOR_USAGE_REPORTING_TASK_SCHEDULE: IntervalSchedule = { interval: '10m' };
export const CONNECTOR_USAGE_REPORTING_TASK_ID = 'connector_usage_reporting';
export const CONNECTOR_USAGE_REPORTING_TASK_TYPE = `actions:${CONNECTOR_USAGE_REPORTING_TASK_ID}`;
export const CONNECTOR_USAGE_REPORTING_TASK_TIMEOUT = 30000;
export const CONNECTOR_USAGE_TYPE = `connector_request_body_bytes`;
export const CONNECTOR_USAGE_REPORTING_MISSING_ID = `missing_project_id`;
export const CONNECTOR_USAGE_REPORTING_SOURCE_ID = `task-connector-usage-report`;
export const MAX_PUSH_ATTEMPTS = 5;

export class ConnectorUsageReportingTask {
  private readonly projectId: string | undefined;
  private readonly logger: Logger;
  private readonly eventLogIndex: string;

  constructor({
    logger,
    eventLogIndex,
    core,
    taskManager,
    projectId,
  }: {
    logger: Logger;
    eventLogIndex: string;
    core: CoreSetup<ActionsPluginsStart>;
    taskManager: TaskManagerSetupContract;
    projectId?: string;
  }) {
    this.projectId = projectId;
    this.logger = logger;
    this.eventLogIndex = eventLogIndex;

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
        `missing required task manager service during start of ${CONNECTOR_USAGE_REPORTING_TASK_TYPE}`
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
    const [{ elasticsearch }] = await core.getStartServices();
    const esClient = elasticsearch.client.asInternalUser;
    const { state } = taskInstance;

    const now = new Date();
    const lastReportedUsageDate: Date = !!state.lastReportedUsageDate
      ? new Date(state.lastReportedUsageDate)
      : new Date('1970-01-01');

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

    const record: ConnectorUsageReport = this.createUsageRecord({ totalUsage, fromDate, toDate });

    try {
      attempts = attempts + 1;
      await this.pushUsageRecord(record);
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

    return (usageResult.aggregations?.total_usage as AggregationsSumAggregate).value || 0;
  };

  private createUsageRecord = ({
    totalUsage,
    fromDate,
    toDate,
  }: {
    totalUsage: number;
    fromDate: Date;
    toDate: Date;
  }): ConnectorUsageReport => {
    const period = (toDate.getTime() - fromDate.getTime()) / 1000;
    const fromStr = fromDate.toISOString();
    const toStr = toDate.toISOString();

    if (!this.projectId) {
      this.logger.warn(`project id missing for records starting from ${toStr}`);
    }

    return {
      id: `connector-request-body-bytes-${fromStr}-${toStr}`,
      usage_timestamp: toStr,
      creation_timestamp: toStr,
      usage: {
        type: CONNECTOR_USAGE_TYPE,
        period_seconds: period,
        quantity: totalUsage,
      },
      source: {
        id: CONNECTOR_USAGE_REPORTING_SOURCE_ID,
        instance_group_id: this.projectId || CONNECTOR_USAGE_REPORTING_MISSING_ID,
      },
    };
  };

  private pushUsageRecord = async (record: ConnectorUsageReport) => {
    return axios.post(USAGE_API_URL, record, {
      headers: { 'Content-Type': 'application/json' },
      timeout: CONNECTOR_USAGE_REPORTING_TASK_TIMEOUT,
      // TODO remove when CRT is added
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
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
