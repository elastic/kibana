/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TASK_METRICS_CHANNEL } from '../constants';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryConfiguration } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { CustomTaskState, TaskExecutionPeriod, TaskState } from '../task';
import { artifactService } from '../artifact';
import { telemetryConfiguration } from '../configuration';
import { createTaskMetric, tlog } from '../helpers';

export function createTelemetryConfigurationTaskConfig() {
  return {
    type: 'security:telemetry-configuration',
    title: 'Security Solution Telemetry Configuration Task',
    interval: '1h',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod,
      taskState: TaskState
    ) => {
      const startTime = Date.now();
      const taskName = 'Security Solution Telemetry Configuration Task';
      const state: CustomTaskState = {
        hits: 0,
      };
      try {
        const artifactName = 'telemetry-buffer-and-batch-sizes-v1';
        const { artifact, etag }: { artifact?: TelemetryConfiguration; etag: string } =
          await artifactService.getArtifact(artifactName, taskState.etag ?? '');
        state.etag = etag;
        if (!artifact) {
          tlog(logger, 'Latest telemetry configuration artifact already applied...skipping');
          return state;
        }
        telemetryConfiguration.max_detection_alerts_batch = artifact.max_detection_alerts_batch;
        telemetryConfiguration.telemetry_max_buffer_size = artifact.telemetry_max_buffer_size;
        telemetryConfiguration.max_detection_rule_telemetry_batch =
          artifact.max_detection_rule_telemetry_batch;
        telemetryConfiguration.max_endpoint_telemetry_batch = artifact.max_endpoint_telemetry_batch;
        telemetryConfiguration.max_security_list_telemetry_batch =
          artifact.max_security_list_telemetry_batch;
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, true, startTime),
        ]);
        state.hits = 1;
        return state;
      } catch (err) {
        tlog(logger, `Failed to set telemetry configuration due to ${err.message}`);
        telemetryConfiguration.resetAllToDefault();
        await sender.sendOnDemand(TASK_METRICS_CHANNEL, [
          createTaskMetric(taskName, false, startTime, err.message),
        ]);
        return state;
      }
    },
  };
}
