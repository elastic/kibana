/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type {
  TelemetryClientStart,
  ReportAlertsGroupingChangedParams,
  ReportAlertsGroupingToggledParams,
  ReportAlertsTakeActionParams,
  ReportEntityDetailsClickedParams,
  ReportEntityAlertsClickedParams,
  ReportEntityRiskFilteredParams,
  ReportMLJobUpdateParams,
  ReportCellActionClickedParams,
  ReportAnomaliesCountClickedParams,
  ReportDataQualityIndexCheckedParams,
  ReportDataQualityCheckAllCompletedParams,
  ReportBreadcrumbClickedParams,
  ReportAssistantInvokedParams,
  ReportAssistantMessageSentParams,
  ReportAssistantQuickPromptParams,
  ReportAssistantSettingToggledParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
  ReportDetailsFlyoutOpenedParams,
  ReportDetailsFlyoutTabClickedParams,
  ReportAssetCriticalityCsvPreviewGeneratedParams,
  ReportAssetCriticalityFileSelectedParams,
  ReportAssetCriticalityCsvImportedParams,
  ReportAddRiskInputToTimelineClickedParams,
  OnboardingHubStepLinkClickedParams,
  OnboardingHubStepOpenParams,
  OnboardingHubStepFinishedParams,
  ReportManualRuleRunCancelJobParams,
  ReportManualRuleRunExecuteParams,
  ReportManualRuleRunOpenModalParams,
  ReportEventLogShowSourceEventDateRangeParams,
  ReportEventLogFilterByRunTypeParams,
} from './types';
import { TelemetryEventTypes } from './constants';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the plugin
 */
export class TelemetryClient implements TelemetryClientStart {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportAlertsGroupingChanged = (params: ReportAlertsGroupingChangedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingChanged, params);
  };

  public reportAlertsGroupingToggled = (params: ReportAlertsGroupingToggledParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingToggled, params);
  };

  public reportAlertsGroupingTakeAction = (params: ReportAlertsTakeActionParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingTakeAction, params);
  };

  public reportAssistantInvoked = (params: ReportAssistantInvokedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssistantInvoked, params);
  };

  public reportAssistantMessageSent = (params: ReportAssistantMessageSentParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssistantMessageSent, params);
  };

  public reportAssistantQuickPrompt = (params: ReportAssistantQuickPromptParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssistantQuickPrompt, params);
  };

  public reportAssistantSettingToggled = (params: ReportAssistantSettingToggledParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssistantSettingToggled, params);
  };

  public reportEntityDetailsClicked = ({ entity }: ReportEntityDetailsClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.EntityDetailsClicked, {
      entity,
    });
  };

  public reportEntityAlertsClicked = ({ entity }: ReportEntityAlertsClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.EntityAlertsClicked, {
      entity,
    });
  };

  public reportEntityRiskFiltered = ({
    entity,
    selectedSeverity,
  }: ReportEntityRiskFilteredParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.EntityRiskFiltered, {
      entity,
      selectedSeverity,
    });
  };

  public reportAssetCriticalityCsvPreviewGenerated = (
    params: ReportAssetCriticalityCsvPreviewGeneratedParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssetCriticalityCsvPreviewGenerated, params);
  };

  public reportAssetCriticalityFileSelected = (
    params: ReportAssetCriticalityFileSelectedParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssetCriticalityFileSelected, params);
  };

  public reportAssetCriticalityCsvImported = (params: ReportAssetCriticalityCsvImportedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AssetCriticalityCsvImported, params);
  };

  public reportMLJobUpdate = (params: ReportMLJobUpdateParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.MLJobUpdate, params);
  };

  reportToggleRiskSummaryClicked(params: ReportToggleRiskSummaryClickedParams): void {
    this.analytics.reportEvent(TelemetryEventTypes.ToggleRiskSummaryClicked, params);
  }
  reportRiskInputsExpandedFlyoutOpened(params: ReportRiskInputsExpandedFlyoutOpenedParams): void {
    this.analytics.reportEvent(TelemetryEventTypes.RiskInputsExpandedFlyoutOpened, params);
  }
  reportAddRiskInputToTimelineClicked(params: ReportAddRiskInputToTimelineClickedParams): void {
    this.analytics.reportEvent(TelemetryEventTypes.AddRiskInputToTimelineClicked, params);
  }

  public reportCellActionClicked = (params: ReportCellActionClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.CellActionClicked, params);
  };

  public reportAnomaliesCountClicked = (params: ReportAnomaliesCountClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AnomaliesCountClicked, params);
  };

  public reportDataQualityIndexChecked = (params: ReportDataQualityIndexCheckedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.DataQualityIndexChecked, params);
  };

  public reportDataQualityCheckAllCompleted = (
    params: ReportDataQualityCheckAllCompletedParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.DataQualityCheckAllCompleted, params);
  };

  public reportBreadcrumbClicked = ({ title }: ReportBreadcrumbClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.BreadcrumbClicked, {
      title,
    });
  };

  public reportDetailsFlyoutOpened = (params: ReportDetailsFlyoutOpenedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.DetailsFlyoutOpened, params);
  };

  public reportDetailsFlyoutTabClicked = (params: ReportDetailsFlyoutTabClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.DetailsFlyoutTabClicked, params);
  };

  public reportOnboardingHubStepOpen = (params: OnboardingHubStepOpenParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.OnboardingHubStepOpen, params);
  };

  public reportOnboardingHubStepFinished = (params: OnboardingHubStepFinishedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.OnboardingHubStepFinished, params);
  };

  public reportOnboardingHubStepLinkClicked = (params: OnboardingHubStepLinkClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.OnboardingHubStepLinkClicked, params);
  };

  public reportManualRuleRunOpenModal = (params: ReportManualRuleRunOpenModalParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ManualRuleRunOpenModal, params);
  };

  public reportManualRuleRunExecute = (params: ReportManualRuleRunExecuteParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ManualRuleRunExecute, params);
  };

  public reportManualRuleRunCancelJob = (params: ReportManualRuleRunCancelJobParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ManualRuleRunCancelJob, params);
  };

  public reportEventLogFilterByRunType = (params: ReportEventLogFilterByRunTypeParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.EventLogFilterByRunType, params);
  };

  public reportEventLogShowSourceEventDateRange(
    params: ReportEventLogShowSourceEventDateRangeParams
  ): void {
    this.analytics.reportEvent(TelemetryEventTypes.EventLogShowSourceEventDateRange, params);
  }
}
