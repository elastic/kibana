/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/core/public';
import type { RiskSeverity } from '../../../../../../common/search_strategy';
import type { ReportAnomaliesCountClickedParams, ReportMLJobUpdateParams } from '../../types';

export enum EntityEventTypes {
  EntityDetailsClicked = 'Entity Details Clicked',
  EntityAlertsClicked = 'Entity Alerts Clicked',
  EntityRiskFiltered = 'Entity Risk Filtered',
  EntityStoreEnablementToggleClicked = 'Entity Store Enablement Toggle Clicked',
  EntityStoreDashboardInitButtonClicked = 'Entity Store Initialization Button Clicked',
  ToggleRiskSummaryClicked = 'Toggle Risk Summary Clicked',
  AddRiskInputToTimelineClicked = 'Add Risk Input To Timeline Clicked',
  RiskInputsExpandedFlyoutOpened = 'Risk Inputs Expanded Flyout Opened',
  AssetCriticalityCsvPreviewGenerated = 'Asset Criticality Csv Preview Generated',
  AssetCriticalityFileSelected = 'Asset Criticality File Selected',
  AssetCriticalityCsvImported = 'Asset Criticality CSV Imported',
  AnomaliesCountClicked = 'Anomalies Count Clicked',
  MLJobUpdate = 'ML Job Update',
}
interface EntityParam {
  entity: 'host' | 'user';
}

type ReportEntityDetailsClickedParams = EntityParam;
type ReportEntityAlertsClickedParams = EntityParam;
interface ReportEntityRiskFilteredParams extends Partial<EntityParam> {
  selectedSeverity: RiskSeverity;
}

interface ReportToggleRiskSummaryClickedParams extends EntityParam {
  action: 'show' | 'hide';
}

type ReportRiskInputsExpandedFlyoutOpenedParams = EntityParam;

interface ReportAddRiskInputToTimelineClickedParams {
  quantity: number;
}

interface ReportAssetCriticalityFileSelectedParams {
  valid: boolean;
  errorCode?: string;
  file: {
    size: number;
  };
}

interface ReportAssetCriticalityCsvPreviewGeneratedParams {
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

interface ReportAssetCriticalityCsvImportedParams {
  file: {
    size: number;
  };
}

interface ReportEntityStoreEnablementParams {
  timestamp: string;
  action: 'start' | 'stop';
}

interface ReportEntityStoreInitParams {
  timestamp: string;
}

// Mapping for Entity events
export type EntityEventTypeData = {
  [K in EntityEventTypes]: K extends EntityEventTypes.EntityDetailsClicked
    ? ReportEntityDetailsClickedParams
    : K extends EntityEventTypes.EntityAlertsClicked
    ? ReportEntityAlertsClickedParams
    : K extends EntityEventTypes.EntityRiskFiltered
    ? ReportEntityRiskFilteredParams
    : K extends EntityEventTypes.EntityStoreEnablementToggleClicked
    ? ReportEntityStoreEnablementParams
    : K extends EntityEventTypes.EntityStoreDashboardInitButtonClicked
    ? ReportEntityStoreInitParams
    : K extends EntityEventTypes.ToggleRiskSummaryClicked
    ? ReportToggleRiskSummaryClickedParams
    : K extends EntityEventTypes.AddRiskInputToTimelineClicked
    ? ReportAddRiskInputToTimelineClickedParams
    : K extends EntityEventTypes.RiskInputsExpandedFlyoutOpened
    ? ReportRiskInputsExpandedFlyoutOpenedParams
    : K extends EntityEventTypes.AssetCriticalityCsvPreviewGenerated
    ? ReportAssetCriticalityCsvPreviewGeneratedParams
    : K extends EntityEventTypes.AssetCriticalityFileSelected
    ? ReportAssetCriticalityFileSelectedParams
    : K extends EntityEventTypes.AssetCriticalityCsvImported
    ? ReportAssetCriticalityCsvImportedParams
    : K extends EntityEventTypes.AnomaliesCountClicked
    ? ReportAnomaliesCountClickedParams
    : K extends EntityEventTypes.MLJobUpdate
    ? ReportMLJobUpdateParams
    : never;
};

export type EntityAnalyticsTelemetryEvent =
  | {
      eventType: EntityEventTypes.EntityDetailsClicked;
      schema: RootSchema<ReportEntityDetailsClickedParams>;
    }
  | {
      eventType: EntityEventTypes.EntityAlertsClicked;
      schema: RootSchema<ReportEntityAlertsClickedParams>;
    }
  | {
      eventType: EntityEventTypes.EntityRiskFiltered;
      schema: RootSchema<ReportEntityRiskFilteredParams>;
    }
  | {
      eventType: EntityEventTypes.AddRiskInputToTimelineClicked;
      schema: RootSchema<ReportAddRiskInputToTimelineClickedParams>;
    }
  | {
      eventType: EntityEventTypes.ToggleRiskSummaryClicked;
      schema: RootSchema<ReportToggleRiskSummaryClickedParams>;
    }
  | {
      eventType: EntityEventTypes.RiskInputsExpandedFlyoutOpened;
      schema: RootSchema<ReportRiskInputsExpandedFlyoutOpenedParams>;
    }
  | {
      eventType: EntityEventTypes.AssetCriticalityCsvPreviewGenerated;
      schema: RootSchema<ReportAssetCriticalityCsvPreviewGeneratedParams>;
    }
  | {
      eventType: EntityEventTypes.AssetCriticalityFileSelected;
      schema: RootSchema<ReportAssetCriticalityFileSelectedParams>;
    }
  | {
      eventType: EntityEventTypes.AssetCriticalityCsvImported;
      schema: RootSchema<ReportAssetCriticalityCsvImportedParams>;
    }
  | {
      eventType: EntityEventTypes.EntityStoreEnablementToggleClicked;
      schema: RootSchema<ReportEntityStoreEnablementParams>;
    }
  | {
      eventType: EntityEventTypes.EntityStoreDashboardInitButtonClicked;
      schema: RootSchema<ReportEntityStoreInitParams>;
    }
  | {
      eventType: EntityEventTypes.AnomaliesCountClicked;
      schema: RootSchema<ReportAnomaliesCountClickedParams>;
    }
  | {
      eventType: EntityEventTypes.MLJobUpdate;
      schema: RootSchema<ReportMLJobUpdateParams>;
    };
