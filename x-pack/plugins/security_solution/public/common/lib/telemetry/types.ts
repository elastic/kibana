/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { SecurityMetadata } from '../../../actions/types';
import type { ML_JOB_TELEMETRY_STATUS, TelemetryEventTypes } from './constants';
import type {
  AlertsGroupingTelemetryEvent,
  ReportAlertsGroupingChangedParams,
  ReportAlertsGroupingTelemetryEventParams,
  ReportAlertsGroupingToggledParams,
  ReportAlertsTakeActionParams,
} from './events/alerts_grouping/types';
import type {
  ReportDataQualityCheckAllCompletedParams,
  ReportDataQualityIndexCheckedParams,
  DataQualityTelemetryEvents,
} from './events/data_quality/types';
import type {
  EntityAnalyticsTelemetryEvent,
  ReportAddRiskInputToTimelineClickedParams,
  ReportEntityAlertsClickedParams,
  ReportEntityAnalyticsTelemetryEventParams,
  ReportEntityDetailsClickedParams,
  ReportEntityRiskFilteredParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
} from './events/entity_analytics/types';
import type {
  AssistantTelemetryEvent,
  ReportAssistantTelemetryEventParams,
  ReportAssistantInvokedParams,
  ReportAssistantQuickPromptParams,
  ReportAssistantMessageSentParams,
  ReportAssistantSettingToggledParams,
} from './events/ai_assistant/types';
import type {
  DocumentDetailsTelemetryEvents,
  ReportDocumentDetailsTelemetryEventParams,
  ReportDetailsFlyoutOpenedParams,
  ReportDetailsFlyoutTabClickedParams,
} from './events/document_details/types';

export * from './events/ai_assistant/types';
export * from './events/alerts_grouping/types';
export * from './events/data_quality/types';
export type {
  ReportEntityAlertsClickedParams,
  ReportEntityDetailsClickedParams,
  ReportEntityRiskFilteredParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
  ReportAddRiskInputToTimelineClickedParams,
} from './events/entity_analytics/types';
export * from './events/document_details/types';

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
  metadata: SecurityMetadata | undefined;
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
  | ReportDocumentDetailsTelemetryEventParams;

export interface TelemetryClientStart {
  reportAlertsGroupingChanged(params: ReportAlertsGroupingChangedParams): void;
  reportAlertsGroupingToggled(params: ReportAlertsGroupingToggledParams): void;
  reportAlertsGroupingTakeAction(params: ReportAlertsTakeActionParams): void;

  reportAssistantInvoked(params: ReportAssistantInvokedParams): void;
  reportAssistantMessageSent(params: ReportAssistantMessageSentParams): void;
  reportAssistantQuickPrompt(params: ReportAssistantQuickPromptParams): void;
  reportAssistantSettingToggled(params: ReportAssistantSettingToggledParams): void;

  // Entity Analytics
  reportEntityDetailsClicked(params: ReportEntityDetailsClickedParams): void;
  reportEntityAlertsClicked(params: ReportEntityAlertsClickedParams): void;
  reportEntityRiskFiltered(params: ReportEntityRiskFilteredParams): void;
  reportMLJobUpdate(params: ReportMLJobUpdateParams): void;
  // Entity Analytics inside Entity Flyout
  reportToggleRiskSummaryClicked(params: ReportToggleRiskSummaryClickedParams): void;
  reportRiskInputsExpandedFlyoutOpened(params: ReportRiskInputsExpandedFlyoutOpenedParams): void;
  reportAddRiskInputToTimelineClicked(params: ReportAddRiskInputToTimelineClickedParams): void;

  reportCellActionClicked(params: ReportCellActionClickedParams): void;

  reportAnomaliesCountClicked(params: ReportAnomaliesCountClickedParams): void;
  reportDataQualityIndexChecked(params: ReportDataQualityIndexCheckedParams): void;
  reportDataQualityCheckAllCompleted(params: ReportDataQualityCheckAllCompletedParams): void;
  reportBreadcrumbClicked(params: ReportBreadcrumbClickedParams): void;

  // document details flyout
  reportDetailsFlyoutOpened(params: ReportDetailsFlyoutOpenedParams): void;
  reportDetailsFlyoutTabClicked(params: ReportDetailsFlyoutTabClickedParams): void;
}

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
    };
