/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { getPreviousDiagTaskTimestamp } from '../helpers';
import { ITelemetryEventsSender } from '../sender';
import type { TelemetryEvent } from '../types';
import { ITelemetryReceiver } from '../receiver';
import { TaskExecutionPeriod } from '../task';

export function createTelemetryDiagnosticsTaskConfig() {
  return {
    type: 'security:endpoint-diagnostics',
    title: 'Security Solution Telemetry Diagnostics task',
    interval: '5m',
    timeout: '1m',
    version: '1.0.0',
    getLastExecutionTime: getPreviousDiagTaskTimestamp,
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: ITelemetryReceiver,
      sender: ITelemetryEventsSender,
      taskExecutionPeriod: TaskExecutionPeriod
    ) => {
      if (!taskExecutionPeriod.last) {
        throw new Error('last execution timestamp is required');
      }

      const response = await receiver.fetchDiagnosticAlerts(
        taskExecutionPeriod.last,
        taskExecutionPeriod.current
      );

      const hits = response.hits?.hits || [];
      if (!Array.isArray(hits) || !hits.length) {
        logger.debug('no diagnostic alerts retrieved');
        return 0;
      }
      logger.debug(`Received ${hits.length} diagnostic alerts`);

      const diagAlerts: TelemetryEvent[] = hits.flatMap((h) =>
        h._source != null ? [h._source] : []
      );
      sender.queueTelemetryEvents(diagAlerts);
      return diagAlerts.length;
    },
  };
}
