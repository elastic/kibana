/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import type { TelemetryConfiguration } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { artifactService } from '../artifact';
import { telemetryConfiguration } from '../configuration';
import { newTelemetryLogger } from '../helpers';

export function createTelemetryConfigurationTaskConfig() {
  const taskName = 'Security Solution Telemetry Configuration Task';
  return {
    type: 'security:telemetry-configuration',
    title: taskName,
    interval: '1h',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      _receiver: ITelemetryReceiver,
      _sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const log = newTelemetryLogger(logger.get('configuration')).l;

      log(`Running task ${taskId} with execution period ${JSON.stringify(taskExecutionPeriod)}`);

      const trace = taskMetricsService.start(taskName);
      try {
        const artifactName = 'telemetry-buffer-and-batch-sizes-v1';
        const artifactContent = await artifactService.getArtifact(artifactName);

        if (!artifactContent) {
          log('No new configuration artifact found, skipping...');
          taskMetricsService.end(trace);
          return 0;
        }

        const configArtifact = artifactContent as unknown as TelemetryConfiguration;

        log(`Got telemetry configuration artifact: ${JSON.stringify(configArtifact)}`);

        telemetryConfiguration.max_detection_alerts_batch =
          configArtifact.max_detection_alerts_batch;
        telemetryConfiguration.telemetry_max_buffer_size = configArtifact.telemetry_max_buffer_size;
        telemetryConfiguration.max_detection_rule_telemetry_batch =
          configArtifact.max_detection_rule_telemetry_batch;
        telemetryConfiguration.max_endpoint_telemetry_batch =
          configArtifact.max_endpoint_telemetry_batch;
        telemetryConfiguration.max_security_list_telemetry_batch =
          configArtifact.max_security_list_telemetry_batch;

        if (configArtifact.use_async_sender) {
          telemetryConfiguration.use_async_sender = configArtifact.use_async_sender;
        }
        taskMetricsService.end(trace);

        log(`Updated TelemetryConfiguration: ${JSON.stringify(telemetryConfiguration)}`);
        return 0;
      } catch (err) {
        log(`Failed to set telemetry configuration due to ${err.message}`);
        telemetryConfiguration.resetAllToDefault();
        taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
