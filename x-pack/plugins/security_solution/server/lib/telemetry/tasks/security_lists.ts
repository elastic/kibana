/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import {
  ENDPOINT_LIST_ID,
  ENDPOINT_EVENT_FILTERS_LIST_ID,
} from '@kbn/securitysolution-list-constants';
import {
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
  TELEMETRY_CHANNEL_LISTS,
  TASK_METRICS_CHANNEL,
} from '../constants';
import type { ESClusterInfo, ESLicense } from '../types';
import { batchTelemetryRecords, templateExceptionList, tlog, createTaskMetric, formatValueListMetaData } from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';

export function createTelemetrySecurityListTaskConfig(maxTelemetryBatch: number) {
  return {
    type: 'security:telemetry-lists',
    title: 'Security Solution Lists Telemetry',
    interval: '24h',
    timeout: '3m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Lists Telemetry';
      try {
        let count = 0;

        const [clusterInfoPromise, licenseInfoPromise] = await Promise.allSettled([
          receiver.fetchClusterInfo(),
          receiver.fetchLicenseInfo(),
        ]);

        const clusterInfo =
          clusterInfoPromise.status === 'fulfilled'
            ? clusterInfoPromise.value
            : ({} as ESClusterInfo);
        const licenseInfo =
          licenseInfoPromise.status === 'fulfilled'
            ? licenseInfoPromise.value
            : ({} as ESLicense | undefined);
        const FETCH_VALUE_LIST_META_DATA_INTERVAL_IN_HOURS = 24;

        // Lists Telemetry: Trusted Applications
        const trustedApps = await receiver.fetchTrustedApplications();
        if (trustedApps?.data) {
          const trustedAppsJson = templateExceptionList(
            trustedApps.data,
            clusterInfo,
            licenseInfo,
            LIST_TRUSTED_APPLICATION
          );
          tlog(logger, `Trusted Apps: ${trustedAppsJson}`);
          count += trustedAppsJson.length;

          const batches = batchTelemetryRecords(trustedAppsJson, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
          }
        }

        // Lists Telemetry: Endpoint Exceptions

        const epExceptions = await receiver.fetchEndpointList(ENDPOINT_LIST_ID);
        if (epExceptions?.data) {
          const epExceptionsJson = templateExceptionList(
            epExceptions.data,
            clusterInfo,
            licenseInfo,
            LIST_ENDPOINT_EXCEPTION
          );
          tlog(logger, `EP Exceptions: ${epExceptionsJson}`);
          count += epExceptionsJson.length;

          const batches = batchTelemetryRecords(epExceptionsJson, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
          }
        }

        // Lists Telemetry: Endpoint Event Filters

        const epFilters = await receiver.fetchEndpointList(ENDPOINT_EVENT_FILTERS_LIST_ID);
        if (epFilters?.data) {
          const epFiltersJson = templateExceptionList(
            epFilters.data,
            clusterInfo,
            licenseInfo,
            LIST_ENDPOINT_EVENT_FILTER
          );
          tlog(logger, `EP Event Filters: ${epFiltersJson}`);
          count += epFiltersJson.length;

          const batches = batchTelemetryRecords(epFiltersJson, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
          }
        }

        // Value list meta data
        const valueListResponse = await receiver.fetchValueListMetaData(
          FETCH_VALUE_LIST_META_DATA_INTERVAL_IN_HOURS
        );
        const valueListMetaData = formatValueListMetaData(valueListResponse, clusterInfo, licenseInfo)
        tlog(logger, `Value List Meta Data: ${JSON.stringify(valueListMetaData)}`);
        if (valueListMetaData?.total_list_count) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, [valueListMetaData]);
        }
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);
        return count;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
