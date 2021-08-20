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
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  TELEMETRY_CHANNEL_LISTS,
} from './constants';
import { batchTelemetryRecords, templateEndpointExceptions, templateTrustedApps } from './helpers';
import { TelemetryEventsSender } from './sender';

export const TelemetrySecuityListsTaskConstants = {
  TIMEOUT: '3m',
  TYPE: 'security:telemetry-lists',
  INTERVAL: '24h',
  VERSION: '1.0.0',
};

const MAX_TELEMETRY_BATCH = 1_000;

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
      return 0;
    }

    const isOptedIn = await this.sender.isTelemetryOptedIn();
    if (!isOptedIn) {
      return 0;
    }

    // Lists Telemetry: Trusted Applications

    const trustedApps = await this.sender.fetchTrustedApplications();
    const trustedAppsJson = templateTrustedApps(trustedApps.data);
    this.logger.debug(`Trusted Apps: ${trustedAppsJson}`);

    batchTelemetryRecords(trustedAppsJson, MAX_TELEMETRY_BATCH).forEach((batch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch)
    );

    // Lists Telemetry: Endpoint Exceptions

    const epExceptions = await this.sender.fetchEndpointList(ENDPOINT_LIST_ID);
    const epExceptionsJson = templateEndpointExceptions(epExceptions.data, LIST_ENDPOINT_EXCEPTION);
    this.logger.debug(`EP Exceptions: ${epExceptionsJson}`);

    batchTelemetryRecords(epExceptionsJson, MAX_TELEMETRY_BATCH).forEach((batch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch)
    );

    // Lists Telemetry: Endpoint Event Filters

    const epFilters = await this.sender.fetchEndpointList(ENDPOINT_EVENT_FILTERS_LIST_ID);
    const epFiltersJson = templateEndpointExceptions(epFilters.data, LIST_ENDPOINT_EVENT_FILTER);
    this.logger.debug(`EP Event Filters: ${epFiltersJson}`);

    batchTelemetryRecords(epFiltersJson, MAX_TELEMETRY_BATCH).forEach((batch) =>
      this.sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch)
    );

    return trustedAppsJson.length + epExceptionsJson.length + epFiltersJson.length;
  };
}
