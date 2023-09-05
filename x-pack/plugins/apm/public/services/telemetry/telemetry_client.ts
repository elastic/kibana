/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import {
  TelemetryEventTypes,
  ITelemetryClient,
  SearchQuerySubmittedParams,
} from './types';

/**
 * Client which aggregate all the available telemetry tracking functions
 * for the Infra plugin
 */
export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportSearchQuerySubmitted = ({
    kuery_fields,
    pathname,
    interval,
    action,
  }: SearchQuerySubmittedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.SEARCH_QUERY_SUBMITTED, {
      kuery_fields,
      pathname,
      interval,
      action,
    });
  };
}
