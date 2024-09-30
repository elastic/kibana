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

export interface EntityInventoryAddDataParams {
  view: 'empty_state' | 'add_data_button' | 'add_apm_cta' | 'add_apm_n/a';
  journey?: 'add_apm_agent' | 'associate_existing_service_logs' | 'collect_new_service_logs';
}

export interface EmptyStateClickParams {
  view: Extract<EntityInventoryAddDataParams['view'], 'add_apm_cta'>;
}

export type TelemetryEventParams =
  | SearchQuerySubmittedParams
  | EntityExperienceStatusParams
  | EntityInventoryPageStateParams
  | EntityInventoryAddDataParams
  | EmptyStateClickParams;

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportEntityExperienceStatusChange(params: EntityExperienceStatusParams): void;
  reportEntityInventoryPageState(params: EntityInventoryPageStateParams): void;
  reportEntityInventoryAddData(params: EntityInventoryAddDataParams): void;
  reportTryItClick(params: EmptyStateClickParams): void;
  reportLearnMoreClick(params: EmptyStateClickParams): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  ENTITY_EXPERIENCE_STATUS = 'entity_experience_status',
  ENTITY_INVENTORY_PAGE_STATE = 'entity_inventory_page_state',
  ENTITY_INVENTORY_ADD_DATA = 'entity_inventory_add_data',
  TRY_IT_CLICK = 'try_it_click',
  LEARN_MORE_CLICK = 'learn_more_click',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams>;
}
