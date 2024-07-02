/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportEventLogFilterByRunTypeParams {
  runType: string[];
}
export interface ReportEventLogShowSourceEventDateRangeParams {
  isVisible: boolean;
}

export type ReportEventLogTelemetryEventParams =
  | ReportEventLogFilterByRunTypeParams
  | ReportEventLogShowSourceEventDateRangeParams;

export type EventLogTelemetryEvent =
  | {
      eventType: TelemetryEventTypes.EventLogFilterByRunType;
      schema: RootSchema<ReportEventLogFilterByRunTypeParams>;
    }
  | {
      eventType: TelemetryEventTypes.EventLogShowSourceEventDateRange;
      schema: RootSchema<ReportEventLogShowSourceEventDateRangeParams>;
    };
