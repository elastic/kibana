/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface ReportDataQualityIndexCheckedParams {
  ecsVersion?: string;
  error?: string;
  indexName: string;
  isCheckAll?: boolean;
  numberOfDocuments?: number;
  numberOfIncompatibleFields?: number;
  numberOfIndices?: number;
  pattern: string;
  sizeInBytes?: number;
  timeConsumedMs?: number;
}

export interface ReportDataQualityCheckAllClickedParams {
  ecsVersion?: string;
  isCheckAll?: boolean;
  numberOfDocuments?: number;
  numberOfIncompatibleFields?: number;
  numberOfIndices?: number;
  numberOfIndicesChecked?: number;
  sizeInBytes?: number;
  timeConsumedMs?: number;
}

export interface DataQualityTelemetryIndexCheckedEvent {
  eventType: TelemetryEventTypes.DataQualityIndexChecked;
  schema: RootSchema<ReportDataQualityIndexCheckedParams>;
}

export interface DataQualityTelemetryCheckAllClickedEvent {
  eventType: TelemetryEventTypes.DataQualityCheckAllClicked;
  schema: RootSchema<ReportDataQualityCheckAllClickedParams>;
}

export type DataQualityTelemetryEvents =
  | DataQualityTelemetryIndexCheckedEvent
  | DataQualityTelemetryCheckAllClickedEvent;
