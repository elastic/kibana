/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RootSchema } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum InfraTelemetryEventTypes {
  HOSTS_VIEW_QUERY_SUBMITTED = 'Hosts View Query Submitted',
  HOSTS_ENTRY_CLICKED = 'Host Entry Clicked',
  HOST_FLYOUT_FILTER_REMOVED = 'Host Flyout Filter Removed',
  HOST_FLYOUT_FILTER_ADDED = 'Host Flyout Filter Added',
  HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED = 'Host View Total Host Count Retrieved',
  ASSET_DETAILS_FLYOUT_VIEWED = 'Asset Details Flyout Viewed',
  ASSET_DETAILS_PAGE_VIEWED = 'Asset Details Page Viewed',
}

export interface HostsViewQuerySubmittedParams {
  control_filter_fields: string[];
  filter_fields: string[];
  interval: string;
  with_query: boolean;
  limit: number;
}

export interface HostEntryClickedParams {
  hostname: string;
  cloud_provider?: string | null;
}

export interface HostFlyoutFilterActionParams {
  field_name: string;
}

export interface HostsViewQueryHostsCountRetrievedParams {
  total: number;
}

export interface AssetDetailsFlyoutViewedParams {
  assetType: string;
  componentName: string;
  tabId?: string;
}
export interface AssetDetailsPageViewedParams extends AssetDetailsFlyoutViewedParams {
  integrations?: string[];
}

export type InfraTelemetryEventParams =
  | HostsViewQuerySubmittedParams
  | HostEntryClickedParams
  | HostFlyoutFilterActionParams
  | HostsViewQueryHostsCountRetrievedParams
  | AssetDetailsFlyoutViewedParams;

export interface ITelemetryClient {
  reportHostEntryClicked(params: HostEntryClickedParams): void;
  reportHostFlyoutFilterRemoved(params: HostFlyoutFilterActionParams): void;
  reportHostFlyoutFilterAdded(params: HostFlyoutFilterActionParams): void;
  reportHostsViewTotalHostCountRetrieved(params: HostsViewQueryHostsCountRetrievedParams): void;
  reportHostsViewQuerySubmitted(params: HostsViewQuerySubmittedParams): void;
  reportAssetDetailsFlyoutViewed(params: AssetDetailsFlyoutViewedParams): void;
  reportAssetDetailsPageViewed(params: AssetDetailsPageViewedParams): void;
}

export type InfraTelemetryEvent =
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED;
      schema: RootSchema<HostsViewQuerySubmittedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_ADDED;
      schema: RootSchema<HostFlyoutFilterActionParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOST_FLYOUT_FILTER_REMOVED;
      schema: RootSchema<HostFlyoutFilterActionParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED;
      schema: RootSchema<HostEntryClickedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED;
      schema: RootSchema<HostsViewQueryHostsCountRetrievedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ASSET_DETAILS_FLYOUT_VIEWED;
      schema: RootSchema<AssetDetailsFlyoutViewedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ASSET_DETAILS_PAGE_VIEWED;
      schema: RootSchema<AssetDetailsPageViewedParams>;
    };
