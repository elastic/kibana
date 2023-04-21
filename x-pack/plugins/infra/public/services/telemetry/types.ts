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
  HOST_FLYOUT_REMOVE_FILTER = 'Host Flyout Remove Filter',
  HOST_FLYOUT_ADD_FILTER = 'Host Flyout Add Filter',
}

export interface HostsViewQuerySubmittedParams {
  control_filters: string[];
  filters: string[];
  interval: string;
  query: string | { [key: string]: any };
}

export interface HostEntryClickedParams {
  hostname: string;
  cloud_provider?: string | null;
}

export interface HostFlyoutFilterActionParams {
  field_name: string;
}

export type InfraTelemetryEventParams =
  | HostsViewQuerySubmittedParams
  | HostEntryClickedParams
  | HostFlyoutFilterActionParams;

export interface ITelemetryClient {
  reportHostEntryClicked(params: HostEntryClickedParams): void;
  reportHostFlyoutRemoveFilter(params: HostFlyoutFilterActionParams): void;
  reportHostFlyoutAddFilter(params: HostFlyoutFilterActionParams): void;
  reportHostsViewQuerySubmitted(params: HostsViewQuerySubmittedParams): void;
}

export type InfraTelemetryEvent =
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED;
      schema: RootSchema<HostsViewQuerySubmittedParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOST_FLYOUT_ADD_FILTER;
      schema: RootSchema<HostFlyoutFilterActionParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOST_FLYOUT_REMOVE_FILTER;
      schema: RootSchema<HostFlyoutFilterActionParams>;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED;
      schema: RootSchema<HostEntryClickedParams>;
    };
