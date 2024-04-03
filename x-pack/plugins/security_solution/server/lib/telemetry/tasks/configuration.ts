/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ITelemetryEventsSender } from '../sender';
import { TelemetryChannel, type TelemetryConfiguration } from '../types';
import type { ITelemetryReceiver } from '../receiver';
import type { TaskExecutionPeriod } from '../task';
import type { ITaskMetricsService } from '../task_metrics.types';
import { artifactService } from '../artifact';
import { telemetryConfiguration } from '../configuration';
import { newTelemetryLogger } from '../helpers';

export function createTelemetryConfigurationTaskConfig() {
  const taskName = 'Security Solution Telemetry Configuration Task';
  const taskType = 'security:telemetry-configuration';
  return {
    type: taskType,
    title: taskName,
    interval: '1h',
    timeout: '1m',
    version: '1.0.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      _receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskMetricsService: ITaskMetricsService,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      const log = newTelemetryLogger(logger.get('configuration'));
      const trace = taskMetricsService.start(taskType);

      log.l(
        `Running task: ${taskId} [last: ${taskExecutionPeriod.last} - current: ${taskExecutionPeriod.current}]`
      );

      try {
        const artifactName = 'telemetry-buffer-and-batch-sizes-v1';
        const manifest = await artifactService.getArtifact(artifactName);

        if (manifest.notModified) {
          log.l('No new configuration artifact found, skipping...');
          taskMetricsService.end(trace);
          return 0;
        }

        const configArtifact = manifest.data as unknown as TelemetryConfiguration;

        log.l(`Got telemetry configuration artifact: ${JSON.stringify(configArtifact)}`);

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

        if (configArtifact.sender_channels) {
          log.l('Updating sender channels configuration');
          telemetryConfiguration.sender_channels = configArtifact.sender_channels;
          const channelsDict = Object.values(TelemetryChannel).reduce(
            (acc, channel) => acc.set(channel as string, channel),
            new Map<string, TelemetryChannel>()
          );

          Object.entries(configArtifact.sender_channels).forEach(([channelName, config]) => {
            if (channelName === 'default') {
              log.l('Updating default configuration');
              sender.updateDefaultQueueConfig({
                bufferTimeSpanMillis: config.buffer_time_span_millis,
                inflightEventsThreshold: config.inflight_events_threshold,
                maxPayloadSizeBytes: config.max_payload_size_bytes,
              });
            } else {
              const channel = channelsDict.get(channelName);
              if (!channel) {
                log.l(`Ignoring unknown channel "${channelName}"`);
              } else {
                log.l(`Updating configuration for channel "${channelName}`);
                sender.updateQueueConfig(channel, {
                  bufferTimeSpanMillis: config.buffer_time_span_millis,
                  inflightEventsThreshold: config.inflight_events_threshold,
                  maxPayloadSizeBytes: config.max_payload_size_bytes,
                });
              }
            }
          });
        }

        taskMetricsService.end(trace);

        log.l(`Updated TelemetryConfiguration: ${JSON.stringify(telemetryConfiguration)}`);
        return 0;
      } catch (err) {
        log.l(`Failed to set telemetry configuration due to ${err.message}`);
        telemetryConfiguration.resetAllToDefault();
        taskMetricsService.end(trace, err);
        return 0;
      }
    },
  };
}
