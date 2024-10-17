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
  view: 'add_data_button' | 'empty_state';
  journey?: 'add_data' | 'associate_existing_service_logs';
}

export interface EntityInventoryViewedParams {
  view_state: 'empty' | 'populated' | 'eem_disabled';
}

export interface SearchQuerySubmittedParams {
  kuery_fields: string[];
  timerange: string;
  action: 'submit' | 'refresh';
}

export interface EntityViewClickedParams {
  entity_type: 'container' | 'host' | 'service';
  view_type: 'detail' | 'flyout';
}

export type TelemetryEventParams =
  | InventoryAddDataParams
  | EntityInventoryViewedParams
  | SearchQuerySubmittedParams
  | EntityViewClickedParams;

export interface ITelemetryClient {
  reportInventoryAddData(params: InventoryAddDataParams): void;
}

export enum TelemetryEventTypes {
  INVENTORY_ADD_DATA_CLICKED = 'inventory_add_data_clicked',
  ENTITY_INVENTORY_VIEWED = 'Entity Inventory Viewed',
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  ENTITY_VIEW_CLICKED = 'Entity View Clicked',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams>;
}
