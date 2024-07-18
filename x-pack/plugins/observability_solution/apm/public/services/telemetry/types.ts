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

export enum SearchQueryActions {
  Submit = 'submit',
  Refresh = 'refresh',
}
export interface SearchQuerySubmittedParams {
  kueryFields: string[];
  timerange: string;
  action: SearchQueryActions;
}

export interface EntityExperienceStatusParams {
  status: 'enabled' | 'disabled';
}

export interface EntityInventoryPageStateParams {
  state: 'empty_state' | 'available';
}

export type TelemetryEventParams =
  | SearchQuerySubmittedParams
  | EntityExperienceStatusParams
  | EntityInventoryPageStateParams;

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportEntityExperienceStatusChange(params: EntityExperienceStatusParams): void;
  reportEntityInventoryPageState(params: EntityInventoryPageStateParams): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  ENTITY_EXPERIENCE_STATUS = 'entity_experience_status',
  ENTITY_INVENTORY_PAGE_STATE = 'entity_inventory_page_state',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams>;
}
