/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import type { TelemetryEventTypes } from '../../constants';

interface EntityParam {
  entity: 'host' | 'user';
}

export type ReportEntityDetailsClickedParams = EntityParam;
export type ReportEntityAlertsClickedParams = EntityParam;
export interface ReportEntityRiskFilteredParams extends EntityParam {
  selectedSeverity: RiskSeverity;
}

export interface ReportToggleRiskSummaryClickedParams extends EntityParam {
  action: 'show' | 'hide';
}

export type ReportRiskInputsExpandedFlyoutOpenedParams = EntityParam;

export interface ReportAddRiskInputToTimelineClickedParams {
  quantity: number;
}

export interface ReportAssetCriticalityFileSelectedParams {
  valid: boolean;
  errorCode?: string;
  file: {
    size: number;
  };
}

export interface ReportAssetCriticalityCsvPreviewGeneratedParams {
  file: {
    size: number;
  };
  processing: {
    startTime: string;
    endTime: string;
    tookMs: number;
  };
  stats: {
    validLines: number;
    invalidLines: number;
    totalLines: number;
  };
}

export interface ReportAssetCriticalityCsvImportedParams {
  file: {
    size: number;
  };
}

export type ReportEntityAnalyticsTelemetryEventParams =
  | ReportEntityDetailsClickedParams
  | ReportEntityAlertsClickedParams
  | ReportEntityRiskFilteredParams
  | ReportToggleRiskSummaryClickedParams
  | ReportRiskInputsExpandedFlyoutOpenedParams
  | ReportAddRiskInputToTimelineClickedParams
  | ReportAssetCriticalityCsvPreviewGeneratedParams
  | ReportAssetCriticalityFileSelectedParams
  | ReportAssetCriticalityCsvImportedParams;

export type EntityAnalyticsTelemetryEvent =
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
      eventType: TelemetryEventTypes.AddRiskInputToTimelineClicked;
      schema: RootSchema<ReportAddRiskInputToTimelineClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.ToggleRiskSummaryClicked;
      schema: RootSchema<ReportToggleRiskSummaryClickedParams>;
    }
  | {
      eventType: TelemetryEventTypes.RiskInputsExpandedFlyoutOpened;
      schema: RootSchema<ReportRiskInputsExpandedFlyoutOpenedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssetCriticalityCsvPreviewGenerated;
      schema: RootSchema<ReportAssetCriticalityCsvPreviewGeneratedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssetCriticalityFileSelected;
      schema: RootSchema<ReportAssetCriticalityFileSelectedParams>;
    }
  | {
      eventType: TelemetryEventTypes.AssetCriticalityCsvImported;
      schema: RootSchema<ReportAssetCriticalityCsvImportedParams>;
    };
