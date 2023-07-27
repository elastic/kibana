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
  ReportAssistantInvokedParams,
  ReportAssistantMessageSentParams,
  ReportAssistantQuickPromptParams,
} from './types';
import { TelemetryEventTypes } from './constants';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the plugin
 */
export class TelemetryClient implements TelemetryClientStart {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportAlertsGroupingChanged = ({
    tableId,
    groupByField,
  }: ReportAlertsGroupingChangedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingChanged, {
      tableId,
      groupByField,
    });
  };

  public reportAlertsGroupingToggled = ({
    isOpen,
    tableId,
    groupNumber,
    groupName,
  }: ReportAlertsGroupingToggledParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingToggled, {
      isOpen,
      tableId,
      groupNumber,
      groupName,
    });
  };

  public reportAlertsGroupingTakeAction = ({
    tableId,
    groupNumber,
    status,
    groupByField,
  }: ReportAlertsTakeActionParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingTakeAction, {
      tableId,
      groupNumber,
      status,
      groupByField,
    });
  };

  public reportAssistantInvoked = ({ conversationId, invokedBy }: ReportAssistantInvokedParams) => {
    console.log('reporting assistant invoked', {
      arg: TelemetryEventTypes.AssistantInvoked,
      conversationId,
      invokedBy,
    });
    this.analytics.reportEvent(TelemetryEventTypes.AssistantInvoked, {
      conversationId,
      invokedBy,
    });
  };

  public reportAssistantMessageSent = ({
    conversationId,
    role,
  }: ReportAssistantMessageSentParams) => {
    console.log('reporting assistant message sent', {
      arg: TelemetryEventTypes.AssistantMessageSent,
      conversationId,
      role,
    });
    this.analytics.reportEvent(TelemetryEventTypes.AssistantMessageSent, {
      conversationId,
      role,
    });
  };

  public reportAssistantQuickPrompt = ({
    conversationId,
    promptTitle,
  }: ReportAssistantQuickPromptParams) => {
    console.log('reporting assistant quick propmpt', {
      arg: TelemetryEventTypes.AssistantMessageSent,
      conversationId,
      promptTitle,
    });
    this.analytics.reportEvent(TelemetryEventTypes.AssistantQuickPrompt, {
      conversationId,
      promptTitle,
    });
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

  public reportCellActionClicked = (params: ReportCellActionClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.CellActionClicked, params);
  };

  public reportAnomaliesCountClicked = (params: ReportAnomaliesCountClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AnomaliesCountClicked, params);
  };
}
