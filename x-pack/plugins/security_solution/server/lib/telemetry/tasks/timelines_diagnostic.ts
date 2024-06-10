/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { DEFAULT_DIAGNOSTIC_INDEX, TELEMETRY_CHANNEL_TIMELINE } from '../constants';
import { ranges, TelemetryTimelineFetcher, newTelemetryLogger } from '../helpers';

export function createTelemetryDiagnosticTimelineTaskConfig() {
  const taskName = 'Security Solution Diagnostic Timeline telemetry';
  const taskType = 'security:telemetry-diagnostic-timelines';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '15m',
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
      const log = newTelemetryLogger(logger.get('timelines_diagnostic'), mdc);
      const trace = taskMetricsService.start(taskType);
      const fetcher = new TelemetryTimelineFetcher(receiver);

      log.l('Running telemetry task');

      try {
        let counter = 0;

        const { rangeFrom, rangeTo } = ranges(taskExecutionPeriod);

        const alerts = await receiver.fetchTimelineAlerts(
          DEFAULT_DIAGNOSTIC_INDEX,
          rangeFrom,
          rangeTo
        );

        log.l('found alerts to process', { length: alerts.length });

        for (const alert of alerts) {
          const result = await fetcher.fetchTimeline(alert);

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline_diagnostic',
            counterType: 'timeline_diagnostic_node_count',
            incrementBy: result.nodes,
          });

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline_diagnostic',
            counterType: 'timeline_diagnostic_event_count',
            incrementBy: result.events,
          });

          if (result.timeline) {
            await sender.sendOnDemand(TELEMETRY_CHANNEL_TIMELINE, [result.timeline]);
            counter += 1;
          } else {
            log.debug('no events in timeline');
          }
        }

        log.l('Concluding timeline task.', { counter });

        await taskMetricsService.end(trace);

        return counter;
      } catch (err) {
        logger.error('could not complete task', { error: err });
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
