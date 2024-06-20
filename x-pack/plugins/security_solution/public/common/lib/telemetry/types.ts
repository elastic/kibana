/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';
import type {
  AttackDiscoveryTelemetryEvent,
  ReportAttackDiscoveriesGeneratedParams,
  ReportAttackDiscoveryTelemetryEventParams,
} from './events/attack_discovery/types';
import type { SecurityCellActionMetadata } from '../../../app/actions/types';
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
  ReportAssetCriticalityCsvPreviewGeneratedParams,
  ReportAssetCriticalityFileSelectedParams,
  ReportAssetCriticalityCsvImportedParams,
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
import type {
  OnboardingHubStepFinishedParams,
  OnboardingHubStepLinkClickedParams,
  OnboardingHubStepOpenParams,
  OnboardingHubTelemetryEvent,
} from './events/onboarding/types';

export * from './events/ai_assistant/types';
export * from './events/alerts_grouping/types';
export * from './events/attack_discovery/types';
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
  | ReportAttackDiscoveryTelemetryEventParams
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
  | OnboardingHubStepLinkClickedParams;

export interface TelemetryClientStart {
  reportAlertsGroupingChanged(params: ReportAlertsGroupingChangedParams): void;
  reportAlertsGroupingToggled(params: ReportAlertsGroupingToggledParams): void;
  reportAlertsGroupingTakeAction(params: ReportAlertsTakeActionParams): void;

  // Assistant
  reportAssistantInvoked(params: ReportAssistantInvokedParams): void;
  reportAssistantMessageSent(params: ReportAssistantMessageSentParams): void;
  reportAssistantQuickPrompt(params: ReportAssistantQuickPromptParams): void;
  reportAssistantSettingToggled(params: ReportAssistantSettingToggledParams): void;

  // Attack discovery
  reportAttackDiscoveriesGenerated(params: ReportAttackDiscoveriesGeneratedParams): void;

  // Entity Analytics
  reportEntityDetailsClicked(params: ReportEntityDetailsClickedParams): void;
  reportEntityAlertsClicked(params: ReportEntityAlertsClickedParams): void;
  reportEntityRiskFiltered(params: ReportEntityRiskFilteredParams): void;
  reportMLJobUpdate(params: ReportMLJobUpdateParams): void;
  // Entity Analytics inside Entity Flyout
  reportToggleRiskSummaryClicked(params: ReportToggleRiskSummaryClickedParams): void;
  reportRiskInputsExpandedFlyoutOpened(params: ReportRiskInputsExpandedFlyoutOpenedParams): void;
  reportAddRiskInputToTimelineClicked(params: ReportAddRiskInputToTimelineClickedParams): void;
  // Entity Analytics Asset Criticality
  reportAssetCriticalityFileSelected(params: ReportAssetCriticalityFileSelectedParams): void;
  reportAssetCriticalityCsvPreviewGenerated(
    params: ReportAssetCriticalityCsvPreviewGeneratedParams
  ): void;
  reportAssetCriticalityCsvImported(params: ReportAssetCriticalityCsvImportedParams): void;
  reportCellActionClicked(params: ReportCellActionClickedParams): void;

  reportAnomaliesCountClicked(params: ReportAnomaliesCountClickedParams): void;
  reportDataQualityIndexChecked(params: ReportDataQualityIndexCheckedParams): void;
  reportDataQualityCheckAllCompleted(params: ReportDataQualityCheckAllCompletedParams): void;
  reportBreadcrumbClicked(params: ReportBreadcrumbClickedParams): void;

  // document details flyout
  reportDetailsFlyoutOpened(params: ReportDetailsFlyoutOpenedParams): void;
  reportDetailsFlyoutTabClicked(params: ReportDetailsFlyoutTabClickedParams): void;

  // onboarding hub
  reportOnboardingHubStepOpen(params: OnboardingHubStepOpenParams): void;
  reportOnboardingHubStepFinished(params: OnboardingHubStepFinishedParams): void;
  reportOnboardingHubStepLinkClicked(params: OnboardingHubStepLinkClickedParams): void;
}

export type TelemetryEvent =
  | AssistantTelemetryEvent
  | AlertsGroupingTelemetryEvent
  | EntityAnalyticsTelemetryEvent
  | DataQualityTelemetryEvents
  | DocumentDetailsTelemetryEvents
  | AttackDiscoveryTelemetryEvent
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
  | OnboardingHubTelemetryEvent;
