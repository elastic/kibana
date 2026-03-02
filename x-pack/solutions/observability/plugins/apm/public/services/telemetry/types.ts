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

export interface SloOverviewFlyoutSearchQueriedParams {
  searchQuery: string;
}

export interface SloOverviewFlyoutStatusFilteredParams {
  statuses: string[];
}

export type TelemetryEventParams =
  | SearchQuerySubmittedParams
  | SloOverviewFlyoutSearchQueriedParams
  | SloOverviewFlyoutStatusFilteredParams
  | Record<string, never>;

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportSloOverviewFlyoutViewed(): void;
  reportSloOverviewFlyoutSearchQueried(params: SloOverviewFlyoutSearchQueriedParams): void;
  reportSloOverviewFlyoutStatusFiltered(params: SloOverviewFlyoutStatusFilteredParams): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  SLO_OVERVIEW_FLYOUT_VIEWED = 'slo_overview_flyout_viewed',
  SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED = 'slo_overview_flyout_search_queried',
  SLO_OVERVIEW_FLYOUT_STATUS_FILTERED = 'slo_overview_flyout_status_filtered',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams> | Record<string, never>;
}
