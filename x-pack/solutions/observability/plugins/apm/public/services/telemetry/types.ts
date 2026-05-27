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

export interface ServiceMapDagreLayoutFallbackParams {
  /** Error constructor name (e.g. TypeError) */
  error_name: string;
  /** Truncated Error.message from Dagre (no graph / service data) */
  error_message: string;
  /** First stack frames flattened; locates Dagre/minified chunk line for investigation */
  stack_head: string;
}

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportSloOverviewFlyoutViewed(): void;
  reportSloOverviewFlyoutSearchQueried(params: SloOverviewFlyoutSearchQueriedParams): void;
  reportSloOverviewFlyoutStatusFiltered(params: SloOverviewFlyoutStatusFilteredParams): void;
  reportSloInfoShown(): void;
  reportServiceMapDagreLayoutFallback(params: ServiceMapDagreLayoutFallbackParams): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  SLO_OVERVIEW_FLYOUT_VIEWED = 'slo_overview_flyout_viewed',
  SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED = 'slo_overview_flyout_search_queried',
  SLO_OVERVIEW_FLYOUT_STATUS_FILTERED = 'slo_overview_flyout_status_filtered',
  SLO_INFO_SHOWN = 'slo_info_shown',
  SERVICE_MAP_DAGRE_LAYOUT_FALLBACK = 'service_map_dagre_layout_fallback',
}

export type TelemetryEvent =
  | {
      eventType: TelemetryEventTypes.SEARCH_QUERY_SUBMITTED;
      schema: RootSchema<SearchQuerySubmittedParams>;
    }
  | {
      eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_VIEWED;
      schema: {};
    }
  | {
      eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED;
      schema: RootSchema<SloOverviewFlyoutSearchQueriedParams>;
    }
  | {
      eventType: TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_STATUS_FILTERED;
      schema: RootSchema<SloOverviewFlyoutStatusFilteredParams>;
    }
  | { eventType: TelemetryEventTypes.SLO_INFO_SHOWN; schema: {} }
  | {
      eventType: TelemetryEventTypes.SERVICE_MAP_DAGRE_LAYOUT_FALLBACK;
      schema: RootSchema<ServiceMapDagreLayoutFallbackParams>;
    };
