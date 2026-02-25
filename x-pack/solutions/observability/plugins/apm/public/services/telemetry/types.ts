/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, RootSchema } from '@kbn/core/public';
import type { SloStatus } from '../../../common/service_inventory';
import type { ApmIndicatorType } from '../../../common/slo_indicator_types';

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
export interface SloCreateFlowStartedParams {
  location:
    | 'service_inventory_actions'
    | 'top_nav_button'
    | 'service_view_actions'
    | 'service_view_slo_callout'
    | 'empty_slo_overview_flyout';
  sloType: ApmIndicatorType;
}

export interface SloManageFlowStartedParams {
  location: 'service_inventory_badge' | 'service_view_badge';
  sloStatus: SloStatus | 'noSLOs';
}

export interface SloAppRedirectClickedParams {
  location: `service_inventory_actions` | `top_nav_button` | `service_view_actions`;
}

export interface ITelemetryClient {
  reportSearchQuerySubmitted(params: SearchQuerySubmittedParams): void;
  reportSloOverviewFlyoutViewed(): void;
  reportSloOverviewFlyoutSearchQueried(params: SloOverviewFlyoutSearchQueriedParams): void;
  reportSloOverviewFlyoutStatusFiltered(params: SloOverviewFlyoutStatusFilteredParams): void;
  reportSloInfoShown(): void;
  reportSloCreateFlowStarted(params: SloCreateFlowStartedParams): void;
  reportSloManageFlowStarted(params: SloManageFlowStartedParams): void;
  reportSloAppRedirectClicked(params: SloAppRedirectClickedParams): void;
  reportSloTopNavClicked(): void;
}

export enum TelemetryEventTypes {
  SEARCH_QUERY_SUBMITTED = 'Search Query Submitted',
  SLO_OVERVIEW_FLYOUT_VIEWED = 'slo_overview_flyout_viewed',
  SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED = 'slo_overview_flyout_search_queried',
  SLO_OVERVIEW_FLYOUT_STATUS_FILTERED = 'slo_overview_flyout_status_filtered',
  SLO_INFO_SHOWN = 'SLO Info Shown',
  SLO_CREATE_FLOW_STARTED = 'SLO Create Flow Started',
  SLO_MANAGE_FLOW_STARTED = 'SLO Manage Flow Started',
  SLO_APP_REDIRECT_CLICKED = 'SLO App Redirect Clicked',
  SLO_TOP_NAV_CLICKED = 'SLO Top Nav Clicked',
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
      eventType: TelemetryEventTypes.SLO_CREATE_FLOW_STARTED;
      schema: RootSchema<SloCreateFlowStartedParams>;
    }
  | {
      eventType: TelemetryEventTypes.SLO_MANAGE_FLOW_STARTED;
      schema: RootSchema<SloManageFlowStartedParams>;
    }
  | {
      eventType: TelemetryEventTypes.SLO_APP_REDIRECT_CLICKED;
      schema: RootSchema<SloAppRedirectClickedParams>;
    }
  | { eventType: TelemetryEventTypes.SLO_TOP_NAV_CLICKED; schema: {} };
