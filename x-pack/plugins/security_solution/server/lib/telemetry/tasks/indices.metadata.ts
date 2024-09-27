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
    interval: '24h',
    timeout: '1m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDailyTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const mdc = { task_id: taskId, task_execution_period: taskExecutionPeriod };
      const log = newTelemetryLogger(logger.get('indices-metadata'), mdc);
      const trace = taskMetricsService.start(taskType);

      // config
      const pageSize = 500;
      const dataStreamsLimit = 500;

      try {
        // 1. Get all data streams
        const dataStreams = (await receiver.getDataStreams()).slice(0, dataStreamsLimit + 1);

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

        let policyCount = 0;
        let indicesCount = 0;
        let ilmsCount = 0;
        let dsCount = 0;

        for await (const stat of receiver.getIndicesStats(dsNames, pageSize)) {
          sender.reportEBT(TELEMETRY_INDEX_STATS_EVENT.eventType, stat);
          indicesCount++;
        }
        log.info(`Sent ${indicesCount} indices stats`, { indicesCount } as LogMeta);

        for await (const stat of receiver.getIlmsStats(indexNames, pageSize)) {
          sender.reportEBT(TELEMETRY_ILM_STATS_EVENT.eventType, stat);
          ilmsCount++;
        }
        log.info(`Sent ${ilmsCount} ILM stats`, { ilmsCount } as LogMeta);

        for (const ds of dataStreams) {
          sender.reportEBT(TELEMETRY_DATA_STREAM_EVENT.eventType, ds);
          dsCount++;
        }
        log.info(`Sent ${dsCount} data streams`, { dsCount } as LogMeta);

        for await (const policy of receiver.getIlmsPolicies(ilmsNames, pageSize)) {
          sender.reportEBT(TELEMETRY_ILM_POLICY_EVENT.eventType, policy);
          policyCount++;
        }
        log.info(`Sent ${policyCount} ILM policies`, { policyCount } as LogMeta);

        log.info(`Sent EBT events`, {
          datastreams: dsCount,
          ilms: ilmsCount,
          indices: indicesCount,
          policies: policyCount,
        } as LogMeta);

        return policyCount + indicesCount + ilmsCount + dsCount;
      } catch (err) {
        log.warn(`Error running indices metadata task`, {
          error: err.message,
        } as LogMeta);
        await taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
