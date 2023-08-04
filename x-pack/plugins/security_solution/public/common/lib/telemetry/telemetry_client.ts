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
  DataQualityIndexCheckedParams,
  DataQualityCheckAllClickedParams,
} from './types';
import { TelemetryEventTypes } from './constants';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the plugin
 */
export class TelemetryClient implements TelemetryClientStart {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportAlertsGroupingChanged = (params: ReportAlertsGroupingChangedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingChanged, params);
  };

  public reportAlertsGroupingToggled = (params: ReportAlertsGroupingToggledParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingToggled, params);
  };

  public reportAlertsGroupingTakeAction = (params: ReportAlertsTakeActionParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.AlertsGroupingTakeAction, params);
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

  public reportDataQualityIndexChecked = (params: DataQualityIndexCheckedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.DataQualityIndexChecked, params);
  };

  public reportDataQualityCheckAllClicked = (params: DataQualityCheckAllClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.DataQualityCheckAllClicked, params);
  };
}
