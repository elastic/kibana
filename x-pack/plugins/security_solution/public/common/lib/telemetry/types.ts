/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { RiskSeverity } from '../../../../common/search_strategy';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum TelemetryEventTypes {
  AlertsGroupingChanged = 'Alerts Grouping Changed',
  AlertsGroupingToggled = 'Alerts Grouping Toggled',
  AlertsGroupingTakeAction = 'Alerts Grouping Take Action',
  EntityDetailsClicked = 'Entity Details Clicked',
  EntityAlertsClicked = 'Entity Alerts Clicked',
  EntityRiskFiltered = 'Entity Risk Filtered',
  MLJobUpdate = 'ML Job Update',
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

interface EntityParam {
  entity: 'host' | 'user';
}

export type ReportEntityDetailsClickedParams = EntityParam;
export type ReportEntityAlertsClickedParams = EntityParam;
export interface ReportEntityRiskFilteredParams extends EntityParam {
  selectedSeverity: RiskSeverity;
}

export enum ML_JOB_TELEMETRY_STATUS {
  started = 'started',
  startError = 'start_error',
  stopped = 'stopped',
  stopError = 'stop_error',
  moduleInstalled = 'module_installed',
  installationError = 'installationError',
}

export interface ReportMLJobUpdateParams {
  jobId: string;
  isElasticJob: boolean;
  status: ML_JOB_TELEMETRY_STATUS;
  moduleId?: string;
  errorMessage?: string;
}

export type TelemetryEventParams =
  | ReportAlertsGroupingChangedParams
  | ReportAlertsGroupingToggledParams
  | ReportAlertsTakeActionParams
  | ReportEntityDetailsClickedParams
  | ReportEntityAlertsClickedParams
  | ReportEntityRiskFilteredParams
  | ReportMLJobUpdateParams;

export interface TelemetryClientStart {
  reportAlertsGroupingChanged(params: ReportAlertsGroupingChangedParams): void;
  reportAlertsGroupingToggled(params: ReportAlertsGroupingToggledParams): void;
  reportAlertsGroupingTakeAction(params: ReportAlertsTakeActionParams): void;

  reportEntityDetailsClicked(params: ReportEntityDetailsClickedParams): void;
  reportEntityAlertsClicked(params: ReportEntityAlertsClickedParams): void;
  reportEntityRiskFiltered(params: ReportEntityRiskFilteredParams): void;
  reportMLJobUpdate(params: ReportMLJobUpdateParams): void;
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
    }
  | {
      eventType: TelemetryEventTypes.EntityDetailsClicked;
      schema: RootSchema<ReportEntityDetailsClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.EntityAlertsClicked;
      schema: RootSchema<ReportEntityAlertsClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.EntityRiskFiltered;
      schema: RootSchema<ReportEntityRiskFilteredParams>;
    }
  | {
      eventType: TelemetryEventTypes.MLJobUpdate;
      schema: RootSchema<ReportMLJobUpdateParams>;
    };
