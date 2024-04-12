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
  ReportInsightsGeneratedParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
  ReportDetailsFlyoutOpenedParams,
  ReportDetailsFlyoutTabClickedParams,
} from './types';
import { TelemetryEventTypes } from './constants';
import type { ReportAddRiskInputToTimelineClickedParams } from './events/entity_analytics/types';

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

  public reportInsightsGenerated = (params: ReportInsightsGeneratedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.InsightsGenerated, params);
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
}
