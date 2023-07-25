/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';
import type { RiskSeverity } from '../../../../common/search_strategy';
import type { SecurityMetadata } from '../../../actions/types';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum TelemetryEventTypes {
  AlertsGroupingChanged = 'Alerts Grouping Changed',
  AlertsGroupingToggled = 'Alerts Grouping Toggled',
  AlertsGroupingTakeAction = 'Alerts Grouping Take Action',
  AssistantInvoked = 'Assistant Invoked',
  EntityDetailsClicked = 'Entity Details Clicked',
  EntityAlertsClicked = 'Entity Alerts Clicked',
  EntityRiskFiltered = 'Entity Risk Filtered',
  MLJobUpdate = 'ML Job Update',
  CellActionClicked = 'Cell Action Clicked',
  AnomaliesCountClicked = 'Anomalies Count Clicked',
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

export interface ReportAssistantInvokedParams {
  location: string;
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

export interface ReportCellActionClickedParams {
  metadata: SecurityMetadata | undefined;
  displayName: string;
  actionId: string;
  fieldName: string;
}

export interface ReportAnomaliesCountClickedParams {
  jobId: string;
  count: number;
}

export type TelemetryEventParams =
  | ReportAlertsGroupingChangedParams
  | ReportAlertsGroupingToggledParams
  | ReportAlertsTakeActionParams
  | ReportAssistantInvokedParams
  | ReportEntityDetailsClickedParams
  | ReportEntityAlertsClickedParams
  | ReportEntityRiskFilteredParams
  | ReportMLJobUpdateParams
  | ReportCellActionClickedParams
  | ReportCellActionClickedParams
  | ReportAnomaliesCountClickedParams;

export interface TelemetryClientStart {
  reportAlertsGroupingChanged(params: ReportAlertsGroupingChangedParams): void;
  reportAlertsGroupingToggled(params: ReportAlertsGroupingToggledParams): void;
  reportAlertsGroupingTakeAction(params: ReportAlertsTakeActionParams): void;

  reportAssistantInvoked(params: ReportAssistantInvokedParams): void;

  reportEntityDetailsClicked(params: ReportEntityDetailsClickedParams): void;
  reportEntityAlertsClicked(params: ReportEntityAlertsClickedParams): void;
  reportEntityRiskFiltered(params: ReportEntityRiskFilteredParams): void;
  reportMLJobUpdate(params: ReportMLJobUpdateParams): void;

  reportCellActionClicked(params: ReportCellActionClickedParams): void;

  reportAnomaliesCountClicked(params: ReportAnomaliesCountClickedParams): void;
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
      eventType: TelemetryEventTypes.AssistantInvoked;
      schema: RootSchema<ReportAssistantInvokedParams>;
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
    }
  | {
      eventType: TelemetryEventTypes.CellActionClicked;
      schema: RootSchema<ReportCellActionClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AnomaliesCountClicked;
      schema: RootSchema<ReportAnomaliesCountClickedParams>;
    };
