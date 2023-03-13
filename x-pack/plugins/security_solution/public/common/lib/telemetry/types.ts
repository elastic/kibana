/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum TelemetryEventTypes {
  AlertsGroupingChanged = 'Alerts Grouping Changed',
  AlertsGroupingToggled = 'Alerts Grouping Toggled',
  AlertsGroupingTakeAction = 'Alerts Grouping Take Action',
}

export interface ReportAlertsGroupingChangedParams {
  tableId: string;
  groupByField: string;
}

export interface ReportAlertsGroupingToggledParams {
  isOpen: boolean;
  tableId: string;
  groupNumber: number;
  groupName?: string | undefined;
}

export interface ReportAlertsTakeActionParams {
  tableId: string;
  groupNumber: number;
  status: 'open' | 'closed' | 'acknowledged';
  groupByField: string;
}

export type TelemetryEventParams =
  | ReportAlertsGroupingChangedParams
  | ReportAlertsGroupingToggledParams
  | ReportAlertsTakeActionParams;

export interface TelemetryClientStart {
  reportAlertsGroupingChanged(params: ReportAlertsGroupingChangedParams): void;
  reportAlertsGroupingToggled(params: ReportAlertsGroupingToggledParams): void;
  reportAlertsGroupingTakeAction(params: ReportAlertsTakeActionParams): void;
}

export type TelemetryEvent =
  | {
      eventType: TelemetryEventTypes.AlertsGroupingToggled;
      schema: RootSchema<ReportAlertsGroupingToggledParams>;
    }
  | {
      eventType: TelemetryEventTypes.AlertsGroupingChanged;
      schema: RootSchema<ReportAlertsGroupingChangedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AlertsGroupingTakeAction;
      schema: RootSchema<ReportAlertsTakeActionParams>;
    };
