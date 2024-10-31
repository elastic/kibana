/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RootSchema } from '@kbn/core/public';

export enum EventLogEventTypes {
  EventLogFilterByRunType = 'Event Log Filter By Run Type',
  EventLogShowSourceEventDateRange = 'Event Log -> Show Source -> Event Date Range',
}
interface ReportEventLogFilterByRunTypeParams {
  runType: string[];
}
interface ReportEventLogShowSourceEventDateRangeParams {
  isVisible: boolean;
}

export type ReportEventLogTelemetryEventParams =
  | ReportEventLogFilterByRunTypeParams
  | ReportEventLogShowSourceEventDateRangeParams;

export type EventLogEventTypeData = {
  [K in EventLogEventTypes]: K extends EventLogEventTypes.EventLogFilterByRunType
    ? ReportEventLogFilterByRunTypeParams
    : K extends EventLogEventTypes.EventLogShowSourceEventDateRange
    ? ReportEventLogShowSourceEventDateRangeParams
    : never;
};

export type EventLogTelemetryEvent =
  | {
      eventType: EventLogEventTypes.EventLogFilterByRunType;
      schema: RootSchema<ReportEventLogFilterByRunTypeParams>;
    }
  | {
      eventType: EventLogEventTypes.EventLogShowSourceEventDateRange;
      schema: RootSchema<ReportEventLogShowSourceEventDateRangeParams>;
    };
