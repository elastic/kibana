/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type {
  ITelemetryClient,
  SearchQuerySubmittedParams,
  ServiceMapDagreLayoutFallbackParams,
  SloOverviewFlyoutSearchQueriedParams,
  SloOverviewFlyoutStatusFilteredParams,
} from './types';
import { TelemetryEventTypes } from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportSearchQuerySubmitted = (params: SearchQuerySubmittedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.SEARCH_QUERY_SUBMITTED, params);
  };

  public reportSloOverviewFlyoutViewed = () => {
    this.analytics.reportEvent(TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_VIEWED, {});
  };

  public reportSloOverviewFlyoutSearchQueried = (params: SloOverviewFlyoutSearchQueriedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_SEARCH_QUERIED, params);
  };

  public reportSloOverviewFlyoutStatusFiltered = (
    params: SloOverviewFlyoutStatusFilteredParams
  ) => {
    this.analytics.reportEvent(TelemetryEventTypes.SLO_OVERVIEW_FLYOUT_STATUS_FILTERED, params);
  };

  public reportSloInfoShown = (): void => {
    this.analytics.reportEvent(TelemetryEventTypes.SLO_INFO_SHOWN, {});
  };

  public reportServiceMapDagreLayoutFallback = (
    params: ServiceMapDagreLayoutFallbackParams
  ): void => {
    this.analytics.reportEvent(TelemetryEventTypes.SERVICE_MAP_DAGRE_LAYOUT_FALLBACK, params);
  };
}
