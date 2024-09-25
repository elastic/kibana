/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LogMeta, Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { getPreviousDailyTaskTimestamp, newTelemetryLogger } from '../helpers';
import {
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
} from '../event_based/events';

export function createTelemetryIndicesMetadataTaskConfig() {
  const taskType = 'security:indices-metadata-telemetry';
  return {
    type: taskType,
    title: 'Security Solution Telemetry Indices Metadata task',
    interval: '1m', // TODO: update!!!
    timeout: '1m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      _sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('indices-metadata'), mdc);
      const trace = taskMetricsService.start(taskType);

      log.l('Running indices metadata task');

      try {
        // 1. Get all data streams
        const dataStreams = await receiver.getDataStreams();

        // and calculate index and ilm names
        const dsNames = dataStreams.map((stream) => stream.datastream_name);
        const indexNames = dataStreams
          .map((ds) => ds.indices?.map((i) => i.index_name) ?? [])
          .flat();
        const ilmsNames = dataStreams
          .map((ds) =>
            ds.indices?.filter((i) => i.ilm_policy !== undefined)?.map((i) => i.ilm_policy)
          )
          .flat() as string[];

        log.info(`Got data streams`, {
          datastreams: dsNames.length,
          ilms: ilmsNames.length,
          indices: indexNames.length,
        } as LogMeta);

        // 2. Get stats
        const [indicesStats, ilmsStats, policies] = await Promise.all([
          receiver.getIndicesStats(dsNames),
          receiver.getIlmsStats(indexNames),
          receiver.getIlmsPolicies(ilmsNames),
        ]);

        // TODO: remove this log
        log.debug(`Got stats`, {
          dataStreams,
          indicesStats,
          ilmsStats,
          policiesStats: policies,
        } as LogMeta);

        // 3. Send events
        policies.forEach((p) => {
          _sender.reportEBT(TELEMETRY_ILM_POLICY_EVENT.eventType, p);
        });

        ilmsStats.forEach((i) => {
          _sender.reportEBT(TELEMETRY_ILM_STATS_EVENT.eventType, i);
        });

        dataStreams.forEach((ds) => {
          _sender.reportEBT(TELEMETRY_DATA_STREAM_EVENT.eventType, ds);
        });

        indicesStats.forEach((is) => {
          _sender.reportEBT(TELEMETRY_INDEX_STATS_EVENT.eventType, is);
        });

        return 0;
      } catch (err) {
        log.warn(`Error running indices metadata task`, {
          error: JSON.stringify(err),
        } as LogMeta);
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
