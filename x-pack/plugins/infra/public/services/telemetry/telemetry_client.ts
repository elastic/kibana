/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import {
  HostEntryClickedParams,
  HostFlyoutFilterActionParams,
  HostsViewQuerySubmittedParams,
  InfraTelemetryEventTypes,
  ITelemetryClient,
} from './types';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the Infra plugin
 */
export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportHostEntryClicked = ({
    hostname,
    cloud_provider: cloudProvider,
  }: HostEntryClickedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOSTS_ENTRY_CLICKED, {
      hostname,
      cloud_provider: cloudProvider ?? 'unknown',
    });
  };

  public reportHostFlyoutRemoveFilter = ({
    field_name: fieldName,
  }: HostFlyoutFilterActionParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOST_FLYOUT_REMOVE_FILTER, {
      field_name: fieldName,
    });
  };

  public reportHostFlyoutAddFilter = ({ field_name: fieldName }: HostFlyoutFilterActionParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOST_FLYOUT_ADD_FILTER, {
      field_name: fieldName,
    });
  };

  public reportHostsViewQuerySubmitted = (params: HostsViewQuerySubmittedParams) => {
    this.analytics.reportEvent(InfraTelemetryEventTypes.HOSTS_VIEW_QUERY_SUBMITTED, params);
  };
}
