/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaArray, SchemaValue } from '@kbn/analytics-client';
import type { AnalyticsServiceSetup } from '@kbn/core/public';

export interface TelemetryServiceSetupParams {
  analytics: AnalyticsServiceSetup;
}

export enum InfraTelemetryEventTypes {
  HOSTS_VIEW_QUERY_SUBMITTED = 'Hosts View Query Submitted',
  HOSTS_ENTRY_CLICKED = 'Host Entry Clicked',
}

export interface HostsViewQuerySubmittedParams {
  control_filters: string[];
  filters: string[];
  interval: string;
  query: string;
}

export interface HostsViewQuerySubmittedSchema {
  control_filters: SchemaArray<string, string>;
  filters: SchemaArray<string, string>;
  interval: SchemaValue<string>;
  query: SchemaValue<string>;
}

export interface HostEntryClickedParams {
  hostname: string;
  cloud_provider?: string;
}

export interface HostEntryClickedSchema {
  hostname: SchemaValue<string>;
  cloud_provider: SchemaValue<string | undefined>;
}

export interface ITelemetryClient {
  reportHostEntryClicked(params: HostEntryClickedParams): void;
  reportHostsViewQuerySubmitted(params: HostsViewQuerySubmittedParams): void;
}

export type InfraTelemetryEventParams = HostsViewQuerySubmittedParams | HostEntryClickedParams;

export type InfraTelemetryEvent =
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED;
      schema: HostsViewQuerySubmittedSchema;
    }
  | {
      eventType: InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED;
      schema: HostEntryClickedSchema;
    };
