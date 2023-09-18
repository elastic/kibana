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

export type ReportEntityAnalyticsTelemetryEventParams =
  | ReportEntityDetailsClickedParams
  | ReportEntityAlertsClickedParams
  | ReportEntityRiskFilteredParams;

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
    };
