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
} from './types';
import { TelemetryEventTypes } from './types';

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
}
