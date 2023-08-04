/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface DataQualityIndexCheckedParams {
  error?: string;
  isCheckAll?: boolean;
  indexName: string;
  numberOfDocuments?: number;
  numberOfIncompatibleFields?: number;
  numberOfIndices?: number;
  pattern: string;
  sizeInBytes?: number;
  timeConsumedMs?: number;
  version?: string;
}

export interface DataQualityCheckAllClickedParams {
  numberOfDocuments?: number;
  numberOfIncompatibleFields?: number;
  numberOfIndices?: number;
  numberOfIndicesChecked?: number;
  sizeInBytes?: number;
  timeConsumedMs?: number;
  version?: string;
}

export interface DataQualityTelemetryIndexCheckedEvent {
  eventType: TelemetryEventTypes.DataQualityIndexChecked;
  schema: RootSchema<DataQualityIndexCheckedParams>;
}

export interface DataQualityTelemetryCheckAllClickedEvent {
  eventType: TelemetryEventTypes.DataQualityCheckAllClicked;
  schema: RootSchema<DataQualityCheckAllClickedParams>;
}

export type DataQualityTelemetryEvents =
  | DataQualityTelemetryIndexCheckedEvent
  | DataQualityTelemetryCheckAllClickedEvent;
