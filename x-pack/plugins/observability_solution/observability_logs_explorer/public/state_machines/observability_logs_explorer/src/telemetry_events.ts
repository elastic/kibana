/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AnalyticsServiceStart } from '@kbn/core/public';
import { singleDatasetSelectionPlainRT } from '@kbn/logs-explorer-plugin/common';
import { DATA_RECEIVED_TELEMETRY_EVENT } from '../../../../common/telemetry_events';
import type {
  CommonObservabilityLogsExplorerContext,
  ObservabilityLogsExplorerEvent,
  WithLogsExplorerState,
} from './types';

function guardContextHasLogsExplorerState(
  context: CommonObservabilityLogsExplorerContext
): context is CommonObservabilityLogsExplorerContext & WithLogsExplorerState {
  return 'logsExplorerState' in context;
}

export const createDataReceivedTelemetryEventEmitter =
  (analytics: AnalyticsServiceStart) =>
  (context: CommonObservabilityLogsExplorerContext, event: ObservabilityLogsExplorerEvent) => {
    if (
      event.type === 'LOGS_EXPLORER_DATA_RECEIVED' &&
      'rowCount' in event &&
      event.rowCount > 0 &&
      guardContextHasLogsExplorerState(context)
    ) {
      const selectedIntegrationName = singleDatasetSelectionPlainRT.is(
        context.logsExplorerState.dataSourceSelection
      )
        ? context.logsExplorerState.dataSourceSelection.selection.name
        : undefined;

      analytics.reportEvent(DATA_RECEIVED_TELEMETRY_EVENT.eventType, {
        rowCount: event.rowCount,
        selectedIntegrationName,
      });
    }
  };
