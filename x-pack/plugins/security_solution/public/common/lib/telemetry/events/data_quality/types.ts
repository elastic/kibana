/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export type ReportDataQualityIndexCheckedParams = ReportDataQualityCheckAllCompletedParams & {
  errorCount?: number;
  ilmPhase?: string;
  indexId?: string | null;
  indexName: string;
  sameFamilyFields?: string[];
  unallowedMappingFields?: string[];
  unallowedValueFields?: string[];
};

export interface ReportDataQualityCheckAllCompletedParams {
  batchId: string;
  ecsVersion?: string;
  isCheckAll?: boolean;
  numberOfDocuments?: number;
  numberOfFields?: number;
  numberOfIncompatibleFields?: number;
  numberOfEcsFields?: number;
  numberOfCustomFields?: number;
  numberOfIndices?: number;
  numberOfIndicesChecked?: number;
  numberOfSameFamily?: number;
  sizeInBytes?: number;
  timeConsumedMs?: number;
}

export interface DataQualityTelemetryIndexCheckedEvent {
  eventType: TelemetryEventTypes.DataQualityIndexChecked;
  schema: RootSchema<ReportDataQualityIndexCheckedParams>;
}

export interface DataQualityTelemetryCheckAllCompletedEvent {
  eventType: TelemetryEventTypes.DataQualityCheckAllCompleted;
  schema: RootSchema<ReportDataQualityCheckAllCompletedParams>;
}

export type DataQualityTelemetryEvents =
  | DataQualityTelemetryIndexCheckedEvent
  | DataQualityTelemetryCheckAllCompletedEvent;
