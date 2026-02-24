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

export interface SloOverviewFlyoutViewedParams {
  location: string;
  serviceName: string;
}

export interface SloOverviewFlyoutServiceNameClickedParams {
  location: string;
  serviceName: string;
}

export interface SloOverviewFlyoutSloLinkClickedParams {
  location: string;
  serviceName: string;
}

export interface SloOverviewFlyoutAlertClickedParams {
  location: string;
  serviceName: string;
  sloId: string;
}

export interface SloOverviewFlyoutSearchQueriedParams {
  location: string;
  serviceName: string;
  searchQuery: string;
}

export interface SloOverviewFlyoutStatusFilteredParams {
  location: string;
  serviceName: string;
  statuses: string[];
}

export interface SloOverviewFlyoutSloClickedParams {
  location: string;
  serviceName: string;
  sloId: string;
}

export type TelemetryEventParams =
  | SearchQuerySubmittedParams
  | SloOverviewFlyoutViewedParams
  | SloOverviewFlyoutServiceNameClickedParams
  | SloOverviewFlyoutSloLinkClickedParams
  | SloOverviewFlyoutAlertClickedParams
  | SloOverviewFlyoutSearchQueriedParams
  | SloOverviewFlyoutStatusFilteredParams
  | SloOverviewFlyoutSloClickedParams;

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportSloOverviewFlyoutViewed(params: SloOverviewFlyoutViewedParams): void;
  reportSloOverviewFlyoutServiceNameClicked(
    params: SloOverviewFlyoutServiceNameClickedParams
  ): void;
  reportSloOverviewFlyoutSloLinkClicked(params: SloOverviewFlyoutSloLinkClickedParams): void;
  reportSloOverviewFlyoutAlertClicked(params: SloOverviewFlyoutAlertClickedParams): void;
  reportSloOverviewFlyoutSearchQueried(params: SloOverviewFlyoutSearchQueriedParams): void;
  reportSloOverviewFlyoutStatusFiltered(params: SloOverviewFlyoutStatusFilteredParams): void;
  reportSloOverviewFlyoutSloClicked(params: SloOverviewFlyoutSloClickedParams): void;
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
  schema: RootSchema<TelemetryEventParams>;
}
