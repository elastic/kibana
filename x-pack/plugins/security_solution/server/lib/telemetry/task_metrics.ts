/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/core/server';
import { newTelemetryLogger } from './helpers';
import { type TelemetryLogger } from './telemetry_logger';
import type { TaskMetric, ITaskMetricsService, Trace } from './task_metrics.types';
import type { ITelemetryEventsSender } from './sender';
import { TelemetryChannel } from './types';
import { telemetryConfiguration } from './configuration';

export class TaskMetricsService implements ITaskMetricsService {
  private readonly logger: TelemetryLogger;

  constructor(logger: Logger, private readonly sender: ITelemetryEventsSender) {
    this.logger = newTelemetryLogger(logger.get('telemetry_events.task_metrics'));
  }

  public start(name: string): Trace {
    return {
      name,
      startedAt: performance.now(),
    };
  }

  public async end(trace: Trace, error?: Error): Promise<void> {
    const event = this.createTaskMetric(trace, error);

    this.logger.l(`Task ${event.name} complete. Task run took ${event.time_executed_in_ms}ms`);

    if (telemetryConfiguration.use_async_sender) {
      this.sender.sendAsync(TelemetryChannel.TASK_METRICS, [event]);
    } else {
      await this.sender.sendOnDemand(TelemetryChannel.TASK_METRICS, [event]);
    }
  }

  public createTaskMetric(trace: Trace, error?: Error): TaskMetric {
    const finishedAt = performance.now();
    return {
      name: trace.name,
      passed: error === undefined,
      time_executed_in_ms: finishedAt - trace.startedAt,
      start_time: trace.startedAt,
      end_time: finishedAt,
      error_message: error?.message,
    };
  }
}
