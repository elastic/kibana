/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';

export enum AlertsEventTypes {
  AlertsGroupingChanged = 'Alerts Grouping Changed',
  AlertsGroupingToggled = 'Alerts Grouping Toggled',
  AlertsGroupingTakeAction = 'Alerts Grouping Take Action',
}

interface ReportAlertsGroupingChangedParams {
  tableId: string;
  groupByField: string;
}

interface ReportAlertsGroupingToggledParams {
  isOpen: boolean;
  tableId: string;
  groupNumber: number;
}

interface ReportAlertsTakeActionParams {
  tableId: string;
  groupNumber: number;
  status: 'open' | 'closed' | 'acknowledged';
  groupByField: string;
}

// Mapping for Alerts events
export type AlertsEventTypeData = {
  [K in AlertsEventTypes]: K extends AlertsEventTypes.AlertsGroupingChanged
    ? ReportAlertsGroupingChangedParams
    : K extends AlertsEventTypes.AlertsGroupingToggled
    ? ReportAlertsGroupingToggledParams
    : K extends AlertsEventTypes.AlertsGroupingTakeAction
    ? ReportAlertsTakeActionParams
    : never;
};

export type ReportAlertsGroupingTelemetryEventParams =
  | ReportAlertsGroupingChangedParams
  | ReportAlertsGroupingToggledParams
  | ReportAlertsTakeActionParams;

export type AlertsGroupingTelemetryEvent =
  | {
      eventType: AlertsEventTypes.AlertsGroupingToggled;
      schema: RootSchema<ReportAlertsGroupingToggledParams>;
    }
  | {
      eventType: AlertsEventTypes.AlertsGroupingChanged;
      schema: RootSchema<ReportAlertsGroupingChangedParams>;
    }
  | {
      eventType: AlertsEventTypes.AlertsGroupingTakeAction;
      schema: RootSchema<ReportAlertsTakeActionParams>;
    };
