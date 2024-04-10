/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
}

export enum ML_JOB_TELEMETRY_STATUS {
  started = 'started',
  startError = 'start_error',
  stopped = 'stopped',
  stopError = 'stop_error',
  moduleInstalled = 'module_installed',
  installationError = 'installationError',
}
