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
import { TELEMETRY_CHANNEL_TIMELINE, TASK_METRICS_CHANNEL } from '../constants';
import { createTaskMetric, ranges, TelemetryTimelineFetcher, tlog } from '../helpers';

export function createTelemetryTimelineTaskConfig() {
  const taskName = 'Security Solution Timeline telemetry';

  return {
    type: 'security:telemetry-timelines',
    title: taskName,
    interval: '1h',
    timeout: '15m',
    version: '1.0.1',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      tlog(
        logger,
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      const fetcher = new TelemetryTimelineFetcher(receiver);

      try {
        let counter = 0;

        const { rangeFrom, rangeTo } = ranges(taskExecutionPeriod);

        const alertsIndex = receiver.getAlertsIndex();
        if (!alertsIndex) {
          throw Error('alerts index is not ready yet, skipping telemetry task');
        }
        const alerts = await receiver.fetchTimelineAlerts(alertsIndex, rangeFrom, rangeTo);

        tlog(logger, `found ${alerts.length} alerts to process`);

        for (const alert of alerts) {
          const result = await fetcher.fetchTimeline(alert);

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_node_count',
            incrementBy: result.nodes,
          });

          sender.getTelemetryUsageCluster()?.incrementCounter({
            counterName: 'telemetry_timeline',
            counterType: 'timeline_event_count',
            incrementBy: result.events,
          });

          if (result.timeline) {
            sender.sendOnDemand(TELEMETRY_CHANNEL_TIMELINE, [result.timeline]);
            counter += 1;
          } else {
            tlog(logger, 'no events in timeline');
          }
        }

        tlog(logger, `sent ${counter} timelines. Concluding timeline task.`);

        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, fetcher.startTime),
        ]);

        return counter;
      } catch (err) {
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, fetcher.startTime, err.message),
        ]);
        return 0;
      }
    },
  };
}
