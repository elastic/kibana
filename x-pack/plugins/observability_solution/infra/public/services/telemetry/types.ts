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

export type TelemetryServiceStart = ITelemetryClient;

export enum InfraTelemetryEventTypes {
  HOSTS_VIEW_QUERY_SUBMITTED = 'Hosts View Query Submitted',
  HOSTS_ENTRY_CLICKED = 'Host Entry Clicked',
  HOST_FLYOUT_FILTER_REMOVED = 'Host Flyout Filter Removed',
  HOST_FLYOUT_FILTER_ADDED = 'Host Flyout Filter Added',
  HOST_VIEW_TOTAL_HOST_COUNT_RETRIEVED = 'Host View Total Host Count Retrieved',
  ASSET_DETAILS_FLYOUT_VIEWED = 'Asset Details Flyout Viewed',
  ASSET_DETAILS_PAGE_VIEWED = 'Asset Details Page Viewed',
  ASSET_DASHBOARD_LOADED = 'Asset Dashboard Loaded',
  ADD_METRICS_CALLOUT_ADD_METRICS_CLICKED = 'Add Metrics Callout Add Metrics Clicked',
  ADD_METRICS_CALLOUT_TRY_IT_CLICKED = 'Add Metrics Callout Try It Clicked',
  ADD_METRICS_CALLOUT_LEARN_MORE_CLICKED = 'Add Metrics Callout Learn More Clicked',
  ADD_METRICS_CALLOUT_DISMISSED = 'Add Metrics Callout Dismissed',
  ANOMALY_DETECTION_SETUP = 'Infra Anomaly Detection Job Setup',
  ANOMALY_DETECTION_DATE_FIELD_CHANGE = 'Infra Anomaly Detection Job Date Field Change',
  ANOMALY_DETECTION_PARTITION_FIELD_CHANGE = 'Infra Anomaly Detection Job Partition Field Change',
  ANOMALY_DETECTION_FILTER_FIELD_CHANGE = 'Infra Anomaly Detection Job Filter Field Change',
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
  with_query: boolean;
  with_filters: boolean;
}

export interface AssetDetailsFlyoutViewedParams {
  assetType: string;
  componentName: string;
  tabId?: string;
}
export interface AssetDetailsPageViewedParams extends AssetDetailsFlyoutViewedParams {
  integrations?: string[];
}
export interface AssetDashboardLoadedParams {
  state: boolean;
  assetType: string;
  filtered_by?: string[];
}

export interface AddMetricsCalloutEventParams {
  view: string;
}

export interface AnomalyDetectionSetupParams {
  job_type: string;
  configured_fields: { start_date: string; partition_field?: string; filter_field?: string };
}

export interface AnomalyDetectionDateFieldChangeParams {
  job_type: string;
  start_date: string;
}

export interface AnomalyDetectionPartitionFieldChangeParams {
  job_type: string;
  partition_field?: string;
}

export interface AnomalyDetectionFilterFieldChangeParams {
  job_type: string;
  filter_field?: string;
}

export type InfraTelemetryEventParams =
  | HostsViewQuerySubmittedParams
  | HostEntryClickedParams
  | HostFlyoutFilterActionParams
  | HostsViewQueryHostsCountRetrievedParams
  | AssetDetailsFlyoutViewedParams
  | AssetDashboardLoadedParams
  | AddMetricsCalloutEventParams
  | AnomalyDetectionSetupParams
  | AnomalyDetectionDateFieldChangeParams
  | AnomalyDetectionPartitionFieldChangeParams
  | AnomalyDetectionFilterFieldChangeParams;

export interface PerformanceMetricInnerEvents {
  key1?: string;
  value1?: number;
}

export interface ITelemetryClient {
  reportHostEntryClicked(params: HostEntryClickedParams): void;
  reportHostFlyoutFilterRemoved(params: HostFlyoutFilterActionParams): void;
  reportHostFlyoutFilterAdded(params: HostFlyoutFilterActionParams): void;
  reportHostsViewTotalHostCountRetrieved(params: HostsViewQueryHostsCountRetrievedParams): void;
  reportHostsViewQuerySubmitted(params: HostsViewQuerySubmittedParams): void;
  reportAssetDetailsFlyoutViewed(params: AssetDetailsFlyoutViewedParams): void;
  reportAssetDetailsPageViewed(params: AssetDetailsPageViewedParams): void;
  reportPerformanceMetricEvent(
    eventName: string,
    duration: number,
    innerEvents: PerformanceMetricInnerEvents,
    meta: Record<string, unknown>
  ): void;
  reportAssetDashboardLoaded(params: AssetDashboardLoadedParams): void;
  reportAddMetricsCalloutAddMetricsClicked(params: AddMetricsCalloutEventParams): void;
  reportAddMetricsCalloutTryItClicked(params: AddMetricsCalloutEventParams): void;
  reportAddMetricsCalloutLearnMoreClicked(params: AddMetricsCalloutEventParams): void;
  reportAddMetricsCalloutDismissed(params: AddMetricsCalloutEventParams): void;
  reportAnomalyDetectionSetup(params: AnomalyDetectionSetupParams): void;
  reportAnomalyDetectionDateFieldChange(params: AnomalyDetectionDateFieldChangeParams): void;
  reportAnomalyDetectionPartitionFieldChange(
    params: AnomalyDetectionPartitionFieldChangeParams
  ): void;
  reportAnomalyDetectionFilterFieldChange(params: AnomalyDetectionFilterFieldChangeParams): void;
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
    }
  | {
      eventType: InfraTelemetryEventTypes.ASSET_DASHBOARD_LOADED;
      schema: RootSchema<AssetDashboardLoadedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_ADD_METRICS_CLICKED;
      schema: RootSchema<AddMetricsCalloutEventParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_LEARN_MORE_CLICKED;
      schema: RootSchema<AddMetricsCalloutEventParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_TRY_IT_CLICKED;
      schema: RootSchema<AddMetricsCalloutEventParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ADD_METRICS_CALLOUT_DISMISSED;
      schema: RootSchema<AddMetricsCalloutEventParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ANOMALY_DETECTION_SETUP;
      schema: RootSchema<AnomalyDetectionSetupParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ANOMALY_DETECTION_DATE_FIELD_CHANGE;
      schema: RootSchema<AnomalyDetectionDateFieldChangeParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ANOMALY_DETECTION_PARTITION_FIELD_CHANGE;
      schema: RootSchema<AnomalyDetectionPartitionFieldChangeParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.ANOMALY_DETECTION_FILTER_FIELD_CHANGE;
      schema: RootSchema<AnomalyDetectionFilterFieldChangeParams>;
    };
