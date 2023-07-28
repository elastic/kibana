/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { TelemetryEventTypes } from '../../constants';

export interface DataQualityCheckedParams {
  numberOfIndices: number;
  timeConsumedMs: number;
  error: string | undefined;
  numberOfIncompatibleFields: number;
  incompatibleFields: Array<{ type?: string; field?: string; value?: string }> | undefined;
  numberOfDocuments: number;
  sizeInBytes: number;
}

export interface DataQualityTelemetryEvent {
  eventType: TelemetryEventTypes.DataQualityChecked;
  schema: RootSchema<DataQualityCheckedParams>;
}
