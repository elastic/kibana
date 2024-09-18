/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ENDPOINT_LIST_ID, ENDPOINT_ARTIFACT_LISTS } from '@kbn/securitysolution-list-constants';
import {
  LIST_ENDPOINT_EXCEPTION,
  LIST_ENDPOINT_EVENT_FILTER,
  LIST_TRUSTED_APPLICATION,
  TELEMETRY_CHANNEL_LISTS,
} from '../constants';
import type { ESClusterInfo, ESLicense, Nullable } from '../types';
import {
  batchTelemetryRecords,
  templateExceptionList,
  formatValueListMetaData,
  createUsageCounterLabel,
  newTelemetryLogger,
} from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';

export function createTelemetrySecurityListTaskConfig(maxTelemetryBatch: number) {
  const taskName = 'Security Solution Lists Telemetry';
  const taskType = 'security:telemetry-lists';
  return {
    type: taskType,
    title: taskName,
    interval: '24h',
    timeout: '3m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('security_lists'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.l('Running telemetry task');

      const usageCollector = sender.getTelemetryUsageCluster();
      const usageLabelPrefix: string[] = ['security_telemetry', 'lists'];
      try {
        let trustedApplicationsCount = 0;
        let endpointExceptionsCount = 0;
        let endpointEventFiltersCount = 0;

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
            : ({} as Nullable<ESLicense>);
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
          trustedApplicationsCount = trustedAppsJson.length;
          log.l('Trusted Apps', { trusted_apps_count: trustedApplicationsCount });

          usageCollector?.incrementCounter({
            counterName: createUsageCounterLabel(usageLabelPrefix),
            counterType: 'trusted_apps_count',
            incrementBy: trustedApplicationsCount,
          });

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
          endpointExceptionsCount = epExceptionsJson.length;
          log.l('EP Exceptions', { ep_exceptions_count: endpointExceptionsCount });

          usageCollector?.incrementCounter({
            counterName: createUsageCounterLabel(usageLabelPrefix),
            counterType: 'endpoint_exceptions_count',
            incrementBy: endpointExceptionsCount,
          });

          const batches = batchTelemetryRecords(epExceptionsJson, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
          }
        }

        // Lists Telemetry: Endpoint Event Filters

        const epFilters = await receiver.fetchEndpointList(ENDPOINT_ARTIFACT_LISTS.eventFilters.id);
        if (epFilters?.data) {
          const epFiltersJson = templateExceptionList(
            epFilters.data,
            clusterInfo,
            licenseInfo,
            LIST_ENDPOINT_EVENT_FILTER
          );
          endpointEventFiltersCount = epFiltersJson.length;
          log.l('EP Event Filters', { ep_filters_count: endpointEventFiltersCount });

          usageCollector?.incrementCounter({
            counterName: createUsageCounterLabel(usageLabelPrefix),
            counterType: 'endpoint_event_filters_count',
            incrementBy: endpointEventFiltersCount,
          });

          const batches = batchTelemetryRecords(epFiltersJson, maxTelemetryBatch);
          for (const batch of batches) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, batch);
          }
        }

        // Value list meta data
        const valueListResponse = await receiver.fetchValueListMetaData(
          FETCH_VALUE_LIST_META_DATA_INTERVAL_IN_HOURS
        );
        const valueListMetaData = formatValueListMetaData(
          valueListResponse,
          clusterInfo,
          licenseInfo
        );
        if (valueListMetaData?.total_list_count) {
          await sender.sendOnDemand(TELEMETRY_CHANNEL_LISTS, [valueListMetaData]);
        }
        await taskMetricsService.end(trace);
        return trustedApplicationsCount + endpointExceptionsCount + endpointEventFiltersCount;
      } catch (err) {
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
