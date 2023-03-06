/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import type {
  ITelemetryClient,
  ReportAlertsGroupingChangedParams,
  ReportAlertsGroupingToggledParams,
  ReportAlertsTakeActionParams,
} from './types';
import { TelemetryEventTypes } from './types';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the plugin
 */
export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportAlertsGroupingChanged = ({
    groupingId,
    selected,
  }: ReportAlertsGroupingChangedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingChanged, {
      groupingId,
      selected,
    });
  };

  public reportAlertsGroupingToggled = ({
    isOpen,
    groupingId,
    groupNumber,
  }: ReportAlertsGroupingToggledParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingChanged, {
      isOpen,
      groupingId,
      groupNumber,
    });
  };

  public reportAlertsGroupingTakeAction = ({
    groupingId,
    groupNumber,
    status,
  }: ReportAlertsTakeActionParams) => {
    console.log(this.analytics.reportEvent, { groupingId, groupNumber, status });
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingTakeAction, {
      groupingId,
      groupNumber,
      status,
    });
  };
}
