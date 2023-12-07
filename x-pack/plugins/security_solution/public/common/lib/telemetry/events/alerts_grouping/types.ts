/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportAlertsGroupingChangedParams {
  tableId: string;
  groupByField: string;
}

export interface ReportAlertsGroupingToggledParams {
  isOpen: boolean;
  tableId: string;
  groupNumber: number;
}

export interface ReportAlertsTakeActionParams {
  tableId: string;
  groupNumber: number;
  status: 'open' | 'closed' | 'acknowledged';
  groupByField: string;
}

export type ReportAlertsGroupingTelemetryEventParams =
  | ReportAlertsGroupingChangedParams
  | ReportAlertsGroupingToggledParams
  | ReportAlertsTakeActionParams;

export type AlertsGroupingTelemetryEvent =
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
