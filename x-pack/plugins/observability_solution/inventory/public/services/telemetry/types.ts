/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export interface InventoryAddDataParams {
  view: 'add_data_button';
  journey?: 'add_data' | 'associate_existing_service_logs';
}

export type TelemetryEventParams = InventoryAddDataParams;

export interface ITelemetryClient {
  reportInventoryAddData(params: InventoryAddDataParams): void;
}

export enum TelemetryEventTypes {
  INVENTORY_ADD_DATA_CLICKED = 'inventory_add_data_clicked',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams>;
}
