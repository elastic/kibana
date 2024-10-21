/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  OpenNoteInExpandableFlyoutClickedParams,
  AddNoteFromExpandableFlyoutClickedParams,
} from './events/notes/types';
import type {
  ReportAlertsGroupingChangedParams,
  ReportAlertsGroupingToggledParams,
  ReportAlertsTakeActionParams,
} from './events/alerts_grouping/types';
import type {
  ReportDataQualityCheckAllCompletedParams,
  ReportDataQualityIndexCheckedParams,
} from './events/data_quality/types';
import type {
  ReportAddRiskInputToTimelineClickedParams,
  ReportEntityAlertsClickedParams,
  ReportEntityDetailsClickedParams,
  ReportEntityRiskFilteredParams,
  ReportRiskInputsExpandedFlyoutOpenedParams,
  ReportToggleRiskSummaryClickedParams,
  ReportAssetCriticalityCsvPreviewGeneratedParams,
  ReportAssetCriticalityFileSelectedParams,
  ReportAssetCriticalityCsvImportedParams,
} from './events/entity_analytics/types';
import type {
  ReportAssistantInvokedParams,
  ReportAssistantQuickPromptParams,
  ReportAssistantMessageSentParams,
  ReportAssistantSettingToggledParams,
} from './events/ai_assistant/types';
import type {
  ReportDetailsFlyoutOpenedParams,
  ReportDetailsFlyoutTabClickedParams,
} from './events/document_details/types';
import type {
  OnboardingHubStepFinishedParams,
  OnboardingHubStepLinkClickedParams,
  OnboardingHubStepOpenParams,
} from './events/onboarding/types';
import type {
  ReportManualRuleRunOpenModalParams,
  ReportManualRuleRunExecuteParams,
  ReportManualRuleRunCancelJobParams,
} from './events/manual_rule_run/types';
import type {
  ReportEventLogFilterByRunTypeParams,
  ReportEventLogShowSourceEventDateRangeParams,
} from './events/event_log/types';

import type { PreviewRuleParams } from './events/preview_rule/types';
import type {
  ReportAnomaliesCountClickedParams,
  ReportBreadcrumbClickedParams,
  ReportCellActionClickedParams,
  ReportMLJobUpdateParams,
} from './types';

export { METRIC_TYPE } from '@kbn/analytics';

export enum TELEMETRY_EVENT {
  // Detections
  SIEM_RULE_ENABLED = 'siem_rule_enabled',
  SIEM_RULE_DISABLED = 'siem_rule_disabled',
  CUSTOM_RULE_ENABLED = 'custom_rule_enabled',
  CUSTOM_RULE_DISABLED = 'custom_rule_disabled',
  // ML
  SIEM_JOB_ENABLED = 'siem_job_enabled',
  SIEM_JOB_DISABLED = 'siem_job_disabled',
  CUSTOM_JOB_ENABLED = 'custom_job_enabled',
  CUSTOM_JOB_DISABLED = 'custom_job_disabled',
  JOB_ENABLE_FAILURE = 'job_enable_failure',
  JOB_DISABLE_FAILURE = 'job_disable_failure',

  // Timeline
  TIMELINE_OPENED = 'open_timeline',
  TIMELINE_SAVED = 'timeline_saved',
  TIMELINE_NAMED = 'timeline_named',

  // UI Interactions
  TAB_CLICKED = 'tab_',

  // Landing pages
  LANDING_CARD = 'landing_card_',
  // Landing page - dashboard
  DASHBOARD = 'navigate_to_dashboard',
  CREATE_DASHBOARD = 'create_dashboard',

  // value list
  OPEN_VALUE_LIST_MODAL = 'open_value_list_modal',
  CREATE_VALUE_LIST_ITEM = 'create_value_list_item',
  DELETE_VALUE_LIST_ITEM = 'delete_value_list_item',
  EDIT_VALUE_LIST_ITEM = 'edit_value_list_item',
  ADDITIONAL_UPLOAD_VALUE_LIST_ITEM = 'additinonal_upload_value_list_item',

  // Bulk custom highlighted fields action
  ADD_INVESTIGATION_FIELDS = 'add_investigation_fields',
  SET_INVESTIGATION_FIELDS = 'set_investigation_fields',
  DELETE_INVESTIGATION_FIELDS = 'delete_investigation_fields',

  // AI assistant on rule creation form
  OPEN_ASSISTANT_ON_RULE_QUERY_ERROR = 'open_assistant_on_rule_query_error',
}

export enum TelemetryEventTypes {
  AlertsGroupingChanged = 'Alerts Grouping Changed',
  AlertsGroupingToggled = 'Alerts Grouping Toggled',
  AlertsGroupingTakeAction = 'Alerts Grouping Take Action',
  BreadcrumbClicked = 'Breadcrumb Clicked',
  AssistantInvoked = 'Assistant Invoked',
  AssistantMessageSent = 'Assistant Message Sent',
  AssistantQuickPrompt = 'Assistant Quick Prompt',
  AssistantSettingToggled = 'Assistant Setting Toggled',
  AssetCriticalityCsvPreviewGenerated = 'Asset Criticality Csv Preview Generated',
  AssetCriticalityFileSelected = 'Asset Criticality File Selected',
  AssetCriticalityCsvImported = 'Asset Criticality CSV Imported',
  EntityDetailsClicked = 'Entity Details Clicked',
  EntityAlertsClicked = 'Entity Alerts Clicked',
  EntityRiskFiltered = 'Entity Risk Filtered',
  MLJobUpdate = 'ML Job Update',
  AddRiskInputToTimelineClicked = 'Add Risk Input To Timeline Clicked',
  ToggleRiskSummaryClicked = 'Toggle Risk Summary Clicked',
  RiskInputsExpandedFlyoutOpened = 'Risk Inputs Expanded Flyout Opened',
  CellActionClicked = 'Cell Action Clicked',
  AnomaliesCountClicked = 'Anomalies Count Clicked',
  DataQualityIndexChecked = 'Data Quality Index Checked',
  DataQualityCheckAllCompleted = 'Data Quality Check All Completed',
  DetailsFlyoutOpened = 'Details Flyout Opened',
  DetailsFlyoutTabClicked = 'Details Flyout Tabs Clicked',
  OnboardingHubStepOpen = 'Onboarding Hub Step Open',
  OnboardingHubStepFinished = 'Onboarding Hub Step Finished',
  OnboardingHubStepLinkClicked = 'Onboarding Hub Step Link Clicked',
  ManualRuleRunOpenModal = 'Manual Rule Run Open Modal',
  ManualRuleRunExecute = 'Manual Rule Run Execute',
  ManualRuleRunCancelJob = 'Manual Rule Run Cancel Job',
  EventLogFilterByRunType = 'Event Log Filter By Run Type',
  EventLogShowSourceEventDateRange = 'Event Log -> Show Source -> Event Date Range',
  OpenNoteInExpandableFlyoutClicked = 'Open Note In Expandable Flyout Clicked',
  AddNoteFromExpandableFlyoutClicked = 'Add Note From Expandable Flyout Clicked',
  PreviewRule = 'Preview rule',
}

export enum ML_JOB_TELEMETRY_STATUS {
  started = 'started',
  startError = 'start_error',
  stopped = 'stopped',
  stopError = 'stop_error',
  moduleInstalled = 'module_installed',
  installationError = 'installationError',
}

export type TelemetryEventTypeData<T extends TelemetryEventTypes> =
  T extends TelemetryEventTypes.AlertsGroupingChanged
    ? ReportAlertsGroupingChangedParams
    : T extends TelemetryEventTypes.AlertsGroupingToggled
    ? ReportAlertsGroupingToggledParams
    : T extends TelemetryEventTypes.AlertsGroupingTakeAction
    ? ReportAlertsTakeActionParams
    : T extends TelemetryEventTypes.BreadcrumbClicked
    ? ReportBreadcrumbClickedParams
    : T extends TelemetryEventTypes.AssistantInvoked
    ? ReportAssistantInvokedParams
    : T extends TelemetryEventTypes.AssistantMessageSent
    ? ReportAssistantMessageSentParams
    : T extends TelemetryEventTypes.AssistantQuickPrompt
    ? ReportAssistantQuickPromptParams
    : T extends TelemetryEventTypes.AssistantSettingToggled
    ? ReportAssistantSettingToggledParams
    : T extends TelemetryEventTypes.AssetCriticalityCsvPreviewGenerated
    ? ReportAssetCriticalityCsvPreviewGeneratedParams
    : T extends TelemetryEventTypes.AssetCriticalityFileSelected
    ? ReportAssetCriticalityFileSelectedParams
    : T extends TelemetryEventTypes.AssetCriticalityCsvImported
    ? ReportAssetCriticalityCsvImportedParams
    : T extends TelemetryEventTypes.EntityDetailsClicked
    ? ReportEntityDetailsClickedParams
    : T extends TelemetryEventTypes.EntityAlertsClicked
    ? ReportEntityAlertsClickedParams
    : T extends TelemetryEventTypes.EntityRiskFiltered
    ? ReportEntityRiskFilteredParams
    : T extends TelemetryEventTypes.MLJobUpdate
    ? ReportMLJobUpdateParams
    : T extends TelemetryEventTypes.AddRiskInputToTimelineClicked
    ? ReportAddRiskInputToTimelineClickedParams
    : T extends TelemetryEventTypes.ToggleRiskSummaryClicked
    ? ReportToggleRiskSummaryClickedParams
    : T extends TelemetryEventTypes.RiskInputsExpandedFlyoutOpened
    ? ReportRiskInputsExpandedFlyoutOpenedParams
    : T extends TelemetryEventTypes.CellActionClicked
    ? ReportCellActionClickedParams
    : T extends TelemetryEventTypes.AnomaliesCountClicked
    ? ReportAnomaliesCountClickedParams
    : T extends TelemetryEventTypes.DataQualityIndexChecked
    ? ReportDataQualityIndexCheckedParams
    : T extends TelemetryEventTypes.DataQualityCheckAllCompleted
    ? ReportDataQualityCheckAllCompletedParams
    : T extends TelemetryEventTypes.DetailsFlyoutOpened
    ? ReportDetailsFlyoutOpenedParams
    : T extends TelemetryEventTypes.DetailsFlyoutTabClicked
    ? ReportDetailsFlyoutTabClickedParams
    : T extends TelemetryEventTypes.OnboardingHubStepOpen
    ? OnboardingHubStepOpenParams
    : T extends TelemetryEventTypes.OnboardingHubStepFinished
    ? OnboardingHubStepFinishedParams
    : T extends TelemetryEventTypes.OnboardingHubStepLinkClicked
    ? OnboardingHubStepLinkClickedParams
    : T extends TelemetryEventTypes.ManualRuleRunOpenModal
    ? ReportManualRuleRunOpenModalParams
    : T extends TelemetryEventTypes.ManualRuleRunExecute
    ? ReportManualRuleRunExecuteParams
    : T extends TelemetryEventTypes.ManualRuleRunCancelJob
    ? ReportManualRuleRunCancelJobParams
    : T extends TelemetryEventTypes.EventLogFilterByRunType
    ? ReportEventLogFilterByRunTypeParams
    : T extends TelemetryEventTypes.EventLogShowSourceEventDateRange
    ? ReportEventLogShowSourceEventDateRangeParams
    : T extends TelemetryEventTypes.OpenNoteInExpandableFlyoutClicked
    ? OpenNoteInExpandableFlyoutClickedParams
    : T extends TelemetryEventTypes.AddNoteFromExpandableFlyoutClicked
    ? AddNoteFromExpandableFlyoutClickedParams
    : T extends TelemetryEventTypes.PreviewRule
    ? PreviewRuleParams
    : never;
