/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  ITelemetryClient,
  SearchQuerySubmittedParams,
  TelemetryEventTypes,
  EntityInventoryAddDataParams,
  EmptyStateClickParams,
} from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportSearchQuerySubmitted = ({
    kueryFields,
    timerange,
    action,
  }: SearchQuerySubmittedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.SEARCH_QUERY_SUBMITTED, {
      kueryFields,
      timerange,
      action,
    });
  };

  public reportEntityInventoryAddData = (params: EntityInventoryAddDataParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_ADD_DATA, params);
  };

  public reportTryItClick = (params: EmptyStateClickParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.TRY_IT_CLICK, params);
  };

  public reportLearnMoreClick = (params: EmptyStateClickParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.LEARN_MORE_CLICK, params);
  };
}
