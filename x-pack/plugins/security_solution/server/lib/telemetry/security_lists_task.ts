/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { Logger } from 'src/core/server';
import {
  ENDPOINT_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../../task_manager/server';
import {
  LIST_TRUSTED_APP,
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  TELEMETRY_CHANNEL_LISTS,
} from './constants';
import { batchTelemetryRecords, templateListData } from './helpers';
import { TelemetryEventsSender } from './sender';

export const TelemetrySecuityListsTaskConstants = {
  TIMEOUT: '3m',
  TYPE: 'security:telemetry-lists',
  INTERVAL: '24h',
  VERSION: '1.0.0',
};

export class TelemetryExceptionListsTask {
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
      [TelemetrySecuityListsTaskConstants.TYPE]: {
        title: 'Security Solution Lists Telemetry',
        timeout: TelemetrySecuityListsTaskConstants.TIMEOUT,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          const { state } = taskInstance;

          return {
            run: async () => {
              const taskExecutionTime = moment().utc().toISOString();
              const hits = await this.runTask(taskInstance.id);

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
        taskType: TelemetrySecuityListsTaskConstants.TYPE,
        scope: ['securitySolution'],
        schedule: {
          interval: TelemetrySecuityListsTaskConstants.INTERVAL,
        },
        state: { runs: 0 },
        params: { version: TelemetrySecuityListsTaskConstants.VERSION },
      });
    } catch (e) {
      this.logger.error(`Error scheduling task, received ${e.message}`);
    }
  };

  private getTaskId = (): string => {
    return `${TelemetrySecuityListsTaskConstants.TYPE}:${TelemetrySecuityListsTaskConstants.VERSION}`;
  };

  public runTask = async (taskId: string) => {
    if (taskId !== this.getTaskId()) {
      this.logger.debug(`Outdated task running: ${taskId}`);
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      this.logger.debug(`Telemetry is not opted-in.`);
      return 0;
    }

    // Lists Telemetry: Trusted Applications

    const trustedApplicationsData = await this.sender.fetchTrustedApplications();
    const trustedApplicationsJson = templateListData(
      trustedApplicationsData.data,
      LIST_TRUSTED_APP
    );
    this.logger.debug(`Trusted Apps: ${trustedApplicationsJson}`);

    batchTelemetryRecords(trustedApplicationsJson, 1_000).forEach((telemetryBatch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, telemetryBatch)
    );

    // Lists Telemetry: Endpoint Exceptions

    const endpointExceptionsData = await this.sender.fetchEndpointList(ENDPOINT_LIST_ID);
    const endpointExceptionsJson = templateListData(
      endpointExceptionsData.data,
      LIST_ENDPOINT_EXCEPTION
    );
    this.logger.debug(`Endpoint Exceptions: ${endpointExceptionsJson}`);

    batchTelemetryRecords(endpointExceptionsJson, 1_000).forEach((telemetryBatch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, telemetryBatch)
    );

    // Lists Telemetry: Endpoint Event Filters

    const endpointFilterListData = await this.sender.fetchEndpointList(
      ENDPOINT_EVENT_FILTERS_LIST_ID
    );
    const endpointFilterListJson = templateListData(
      endpointFilterListData.data,
      LIST_ENDPOINT_EVENT_FILTER
    );
    this.logger.debug(`Endpoint Event Filters: ${endpointFilterListJson}`);

    batchTelemetryRecords(endpointFilterListJson, 1_000).forEach((telemetryBatch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, telemetryBatch)
    );

    return (
      trustedApplicationsJson.length + endpointExceptionsJson.length + endpointFilterListJson.length
    );
  };
}
