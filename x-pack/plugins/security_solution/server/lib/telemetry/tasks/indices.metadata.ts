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
  TELEMETRY_CLUSTER_STATS_EVENT,
  TELEMETRY_DATA_STREAM_EVENT,
  TELEMETRY_ILM_POLICY_EVENT,
  TELEMETRY_ILM_STATS_EVENT,
  TELEMETRY_INDEX_STATS_EVENT,
} from '../event_based/events';
import type { QueryConfig } from '../collections_helpers';
import { telemetryConfiguration } from '../configuration';

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

      const taskConfig = telemetryConfiguration.indices_metadata_config;

      // TODO: not use taskExecutionPeriod, it's just to test the task using the temporary API
      const queryConfig: QueryConfig = {
        maxPrefixes: Number(taskExecutionPeriod.last ?? taskConfig.max_prefixes),
        maxGroupSize: Number(taskExecutionPeriod.current ?? taskConfig.max_group_size),
      };

      try {
        let policyCount = 0;
        let indicesCount = 0;
        let ilmsCount = 0;
        let dsCount = 0;

        // 1. Get cluster stats and list of indices and datastreams
        const [clusterStats, indices, dataStreams] = await Promise.all([
          receiver.getClusterStats(),
          receiver.getIndices(),
          receiver.getDataStreams(),
        ]);

        sender.reportEBT(TELEMETRY_CLUSTER_STATS_EVENT.eventType, clusterStats);

        // 2. Publish datastreams stats
        for (const ds of dataStreams.slice(0, taskConfig.datastreams_threshold)) {
          sender.reportEBT(TELEMETRY_DATA_STREAM_EVENT.eventType, ds);
          dsCount++;
        }
        log.info(`Sent ${dsCount} data streams`, { dsCount } as LogMeta);

        // 3. Get and publish indices stats
        for await (const stat of receiver.getIndicesStats(
          indices.slice(0, taskConfig.indices_threshold),
          queryConfig
        )) {
          sender.reportEBT(TELEMETRY_INDEX_STATS_EVENT.eventType, stat);
          indicesCount++;
        }
        log.info(`Sent ${indicesCount} indices stats`, { indicesCount } as LogMeta);

        // 4. Get ILM stats and publish them
        const ilmNames = new Set<string>();
        for await (const stat of receiver.getIlmsStats(indices, queryConfig)) {
          if (stat.policy_name !== undefined) {
            ilmNames.add(stat.policy_name);
            sender.reportEBT(TELEMETRY_ILM_STATS_EVENT.eventType, stat);
            ilmsCount++;
          }
        }
        log.info(`Sent ${ilmsCount} ILM stats`, { ilmsCount } as LogMeta);

        // 5. Publish ILM policies
        for await (const policy of receiver.getIlmsPolicies(
          Array.from(ilmNames.values()),
          queryConfig
        )) {
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

        return indicesCount;
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
