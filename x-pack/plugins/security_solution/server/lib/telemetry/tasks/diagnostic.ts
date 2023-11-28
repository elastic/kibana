/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { tlog, getPreviousDiagTaskTimestamp, createTaskMetric } from '../helpers';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryEvent } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import {
  TELEMETRY_CHANNEL_ENDPOINT_ALERTS,
  TASK_METRICS_CHANNEL,
  DEFAULT_DIAGNOSTIC_INDEX,
} from '../constants';
import { copyAllowlistedFields, filterList } from '../filterlists';

export function createTelemetryDiagnosticsTaskConfig() {
  return {
    type: 'security:endpoint-diagnostics',
    title: 'Security Solution Telemetry Diagnostics task',
    interval: '5m',
    timeout: '4m',
    version: '1.1.0',
    getLastExecutionTime: getPreviousDiagTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Telemetry Diagnostics task';
      try {
        if (!taskExecutionPeriod.last) {
          throw new Error('last execution timestamp is required');
        }

        let alertCount = 0;
        let fetchMore = true;
        let searchAfterValue: SortResults | undefined;
        let pitId = await receiver.openPointInTime(DEFAULT_DIAGNOSTIC_INDEX);

        while (fetchMore) {
          const { moreToFetch, newPitId, searchAfter, alerts } =
            await receiver.fetchDiagnosticAlertsBatch(
              taskExecutionPeriod.last,
              taskExecutionPeriod.current,
              pitId,
              searchAfterValue
            );

          if (alerts.length === 0) {
            tlog(logger, 'no diagnostic alerts retrieved');
            await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
              createTaskMetric(taskName, true, startTime),
            ]);
            return alertCount;
          }

          fetchMore = moreToFetch;
          searchAfterValue = searchAfter;
          pitId = newPitId;

          const processedAlerts = alerts.map(
            (event: TelemetryEvent): TelemetryEvent =>
              copyAllowlistedFields(filterList.endpointAlerts, event)
          );

          alertCount += alerts.length;
          tlog(logger, `Sending ${alerts.length} diagnostic alerts`);
          await sender.sendOnDemand(TELEMETRY_CHANNEL_ENDPOINT_ALERTS, processedAlerts);
        }

        await receiver.closePointInTime(pitId);
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);

        return alertCount;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
