/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { newTelemetryLogger, getPreviousDiagTaskTimestamp } from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryEvent } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { TELEMETRY_CHANNEL_ENDPOINT_ALERTS } from '../constants';
import { copyAllowlistedFields, filterList } from '../filterlists';

export function createTelemetryDiagnosticsTaskConfig() {
  const taskName = 'Security Solution Telemetry Diagnostics task';
  const taskType = 'security:endpoint-diagnostics';
  return {
    type: taskType,
    title: taskName,
    interval: '5m',
    timeout: '4m',
    version: '1.1.0',
    getLastExecutionTime: getPreviousDiagTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('diagnostic'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.l('Running telemetry task');

      try {
        if (!taskExecutionPeriod.last) {
          throw new Error('last execution timestamp is required');
        }

        let alertCount = 0;

        for await (const alerts of receiver.fetchDiagnosticAlertsBatch(
          taskExecutionPeriod.last,
          taskExecutionPeriod.current
        )) {
          const processedAlerts = alerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              copyAllowlistedFields(filterList.endpointAlerts, event)
          );

          if (alerts.length === 0) {
            log.debug('no diagnostic alerts retrieved');
            await taskMetricsService.end(trace);
            return alertCount;
          }

          alertCount += alerts.length;
          log.l('Sending diagnostic alerts', {
            alerts_count: alerts.length,
          });
          await sender.sendOnDemand(TELEMETRY_CHANNEL_ENDPOINT_ALERTS, processedAlerts);
        }

        await taskMetricsService.end(trace);
        return alertCount;
      } catch (err) {
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
