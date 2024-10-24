/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';
import type { SecurityCellActionMetadata } from '../../../app/actions/types';
import type { ML_JOB_TELEMETRY_STATUS, TelemetryEventTypes } from './constants';
import type {
  AlertsGroupingTelemetryEvent,
  ReportAlertsGroupingTelemetryEventParams,
} from './events/alerts_grouping/types';
import type {
  ReportDataQualityCheckAllCompletedParams,
  ReportDataQualityIndexCheckedParams,
  DataQualityTelemetryEvents,
} from './events/data_quality/types';
import type {
  EntityAnalyticsTelemetryEvent,
  ReportEntityAnalyticsTelemetryEventParams,
} from './events/entity_analytics/types';
import type {
  AssistantTelemetryEvent,
  ReportAssistantTelemetryEventParams,
} from './events/ai_assistant/types';
import type {
  DocumentDetailsTelemetryEvents,
  ReportDocumentDetailsTelemetryEventParams,
} from './events/document_details/types';
import type {
  OnboardingHubStepFinishedParams,
  OnboardingHubStepLinkClickedParams,
  OnboardingHubStepOpenParams,
  OnboardingHubTelemetryEvent,
} from './events/onboarding/types';
import type {
  ManualRuleRunTelemetryEvent,
  ReportManualRuleRunTelemetryEventParams,
} from './events/manual_rule_run/types';
import type {
  EventLogTelemetryEvent,
  ReportEventLogTelemetryEventParams,
} from './events/event_log/types';
import type { NotesTelemetryEventParams, NotesTelemetryEvents } from './events/notes/types';
import type { PreviewRuleParams, PreviewRuleTelemetryEvent } from './events/preview_rule/types';

export * from './events/ai_assistant/types';
export * from './events/alerts_grouping/types';
export * from './events/data_quality/types';
export * from './events/onboarding/types';
export type {
  ReportEntityAlertsClickedParams,
  ReportEntityDetailsClickedParams,
  ReportEntityRiskFilteredParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
  ReportAddRiskInputToTimelineClickedParams,
  ReportAssetCriticalityCsvPreviewGeneratedParams,
  ReportAssetCriticalityFileSelectedParams,
  ReportAssetCriticalityCsvImportedParams,
} from './events/entity_analytics/types';
export * from './events/document_details/types';
export * from './events/manual_rule_run/types';
export * from './events/event_log/types';
export * from './events/preview_rule/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export interface ReportMLJobUpdateParams {
  jobId: string;
  isElasticJob: boolean;
  status: ML_JOB_TELEMETRY_STATUS;
  moduleId?: string;
  errorMessage?: string;
}

export interface ReportCellActionClickedParams {
  metadata: SecurityCellActionMetadata | undefined;
  displayName: string;
  actionId: string;
  fieldName: string;
}

export interface ReportAnomaliesCountClickedParams {
  jobId: string;
  count: number;
}

export interface ReportBreadcrumbClickedParams {
  title: string;
}

export type TelemetryEventParams =
  | ReportAlertsGroupingTelemetryEventParams
  | ReportAssistantTelemetryEventParams
  | ReportEntityAnalyticsTelemetryEventParams
  | ReportMLJobUpdateParams
  | ReportCellActionClickedParams
  | ReportAnomaliesCountClickedParams
  | ReportDataQualityIndexCheckedParams
  | ReportDataQualityCheckAllCompletedParams
  | ReportBreadcrumbClickedParams
  | ReportDocumentDetailsTelemetryEventParams
  | OnboardingHubStepOpenParams
  | OnboardingHubStepFinishedParams
  | OnboardingHubStepLinkClickedParams
  | ReportManualRuleRunTelemetryEventParams
  | ReportEventLogTelemetryEventParams
  | PreviewRuleParams
  | NotesTelemetryEventParams;

export type TelemetryEvent =
  | AssistantTelemetryEvent
  | AlertsGroupingTelemetryEvent
  | EntityAnalyticsTelemetryEvent
  | DataQualityTelemetryEvents
  | DocumentDetailsTelemetryEvents
  | {
      eventType: TelemetryEventTypes.MLJobUpdate;
      schema: RootSchema<ReportMLJobUpdateParams>;
    }
  | {
      eventType: TelemetryEventTypes.CellActionClicked;
      schema: RootSchema<ReportCellActionClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AnomaliesCountClicked;
      schema: RootSchema<ReportAnomaliesCountClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.BreadcrumbClicked;
      schema: RootSchema<ReportBreadcrumbClickedParams>;
    }
  | OnboardingHubTelemetryEvent
  | ManualRuleRunTelemetryEvent
  | EventLogTelemetryEvent
  | PreviewRuleTelemetryEvent
  | NotesTelemetryEvents;
