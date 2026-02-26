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
  | SloOverviewFlyoutStatusFilteredParams;

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportSloOverviewFlyoutViewed(): void;
  reportSloOverviewFlyoutServiceNameClicked(): void;
  reportSloOverviewFlyoutSloLinkClicked(): void;
  reportSloOverviewFlyoutAlertClicked(): void;
  reportSloOverviewFlyoutSearchQueried(params: SloOverviewFlyoutSearchQueriedParams): void;
  reportSloOverviewFlyoutStatusFiltered(params: SloOverviewFlyoutStatusFilteredParams): void;
  reportSloOverviewFlyoutSloClicked(): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  SLO_OVERVIEW_FLYOUT_VIEWED = 'SLO Overview Flyout Viewed',
  SLO_OVERVIEW_FLYOUT_SERVICE_NAME_CLICKED = 'SLO Overview Flyout Service Name Clicked',
  SLO_OVERVIEW_FLYOUT_SLO_LINK_CLICKED = 'SLO Overview Flyout SLO Link Clicked',
  SLO_OVERVIEW_FLYOUT_ALERT_CLICKED = 'SLO Overview Flyout Alert Clicked',
  SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED = 'SLO Overview Flyout Search Queried',
  SLO_OVERVIEW_FLYOUT_STATUS_FILTERED = 'SLO Overview Flyout Status Filtered',
  SLO_OVERVIEW_FLYOUT_SLO_CLICKED = 'SLO Overview Flyout SLO Clicked',
}

export interface TelemetryEvent {
  eventType: TelemetryEventTypes;
  schema: RootSchema<TelemetryEventParams> | Record<string, never>;
}
