/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AnalyticsServiceStart } from '@kbn/core/public';
import { DATA_RECEIVED_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import type { ObservabilityLogsExplorerContext, ObservabilityLogsExplorerEvent } from './types';

export const createDataReceivedTelemetryEventEmitter =
  (analytics: AnalyticsServiceStart) =>
  (context: ObservabilityLogsExplorerContext, event: ObservabilityLogsExplorerEvent) => {
    if (event.type === 'LOGS_EXPLORER_DATA_RECEIVED' && 'rowCount' in event && event.rowCount > 0) {
      analytics.reportEvent(DATA_RECEIVED_TELEMETRY_EVENT.eventType, {
        rowCount: event.rowCount,
      });
    }
  };
