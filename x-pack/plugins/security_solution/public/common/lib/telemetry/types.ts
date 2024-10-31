/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type {
  AlertsEventTypeData,
  AlertsEventTypes,
  AlertsGroupingTelemetryEvent,
} from './events/alerts_grouping/types';
import type {
  DataQualityEventTypeData,
  DataQualityEventTypes,
  DataQualityTelemetryEvents,
} from './events/data_quality/types';
import type {
  EntityAnalyticsTelemetryEvent,
  EntityEventTypeData,
  EntityEventTypes,
} from './events/entity_analytics/types';
import type {
  AssistantEventTypeData,
  AssistantEventTypes,
  AssistantTelemetryEvent,
} from './events/ai_assistant/types';
import type {
  DocumentDetailsTelemetryEvents,
  DocumentEventTypeData,
  DocumentEventTypes,
} from './events/document_details/types';
import type {
  OnboardingHubEventTypeData,
  OnboardingHubEventTypes,
  OnboardingHubTelemetryEvent,
} from './events/onboarding/types';
import type {
  ManualRuleRunEventTypeData,
  ManualRuleRunEventTypes,
  ManualRuleRunTelemetryEvent,
} from './events/manual_rule_run/types';
import type {
  EventLogEventTypeData,
  EventLogEventTypes,
  EventLogTelemetryEvent,
} from './events/event_log/types';
import type {
  NotesEventTypeData,
  NotesEventTypes,
  NotesTelemetryEvents,
} from './events/notes/types';
import type {
  PreviewRuleEventTypeData,
  PreviewRuleEventTypes,
  PreviewRuleTelemetryEvent,
} from './events/preview_rule/types';
import type { AppEventTypeData, AppEventTypes, AppTelemetryEvents } from './events/app/types';

export * from './events/app/types';
export * from './events/ai_assistant/types';
export * from './events/alerts_grouping/types';
export * from './events/data_quality/types';
export * from './events/onboarding/types';
export * from './events/entity_analytics/types';
export * from './events/document_details/types';
export * from './events/manual_rule_run/types';
export * from './events/event_log/types';
export * from './events/preview_rule/types';
export * from './events/notes/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum ML_JOB_TELEMETRY_STATUS {
  started = 'started',
  startError = 'start_error',
  stopped = 'stopped',
  stopError = 'stop_error',
  moduleInstalled = 'module_installed',
  installationError = 'installationError',
}

export interface ReportMLJobUpdateParams {
  jobId: string;
  isElasticJob: boolean;
  status: ML_JOB_TELEMETRY_STATUS;
  moduleId?: string;
  errorMessage?: string;
}

export interface ReportAnomaliesCountClickedParams {
  jobId: string;
  count: number;
}

// Combine all event type data
export type TelemetryEventTypeData<T extends TelemetryEventTypes> = T extends AssistantEventTypes
  ? AssistantEventTypeData[T]
  : T extends AlertsEventTypes
  ? AlertsEventTypeData[T]
  : T extends PreviewRuleEventTypes
  ? PreviewRuleEventTypeData[T]
  : T extends EntityEventTypes
  ? EntityEventTypeData[T]
  : T extends DataQualityEventTypes
  ? DataQualityEventTypeData[T]
  : T extends DocumentEventTypes
  ? DocumentEventTypeData[T]
  : T extends OnboardingHubEventTypes
  ? OnboardingHubEventTypeData[T]
  : T extends ManualRuleRunEventTypes
  ? ManualRuleRunEventTypeData[T]
  : T extends EventLogEventTypes
  ? EventLogEventTypeData[T]
  : T extends NotesEventTypes
  ? NotesEventTypeData[T]
  : T extends AppEventTypes
  ? AppEventTypeData[T]
  : never;

export type TelemetryEvent =
  | AssistantTelemetryEvent
  | AlertsGroupingTelemetryEvent
  | PreviewRuleTelemetryEvent
  | EntityAnalyticsTelemetryEvent
  | DataQualityTelemetryEvents
  | DocumentDetailsTelemetryEvents
  | AppTelemetryEvents
  | OnboardingHubTelemetryEvent
  | ManualRuleRunTelemetryEvent
  | EventLogTelemetryEvent
  | NotesTelemetryEvents;

export type TelemetryEventTypes =
  | AssistantEventTypes
  | AlertsEventTypes
  | PreviewRuleEventTypes
  | EntityEventTypes
  | DataQualityEventTypes
  | DocumentEventTypes
  | OnboardingHubEventTypes
  | ManualRuleRunEventTypes
  | EventLogEventTypes
  | NotesEventTypes
  | AppEventTypes;
