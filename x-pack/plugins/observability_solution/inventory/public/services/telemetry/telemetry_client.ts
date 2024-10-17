/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import {
  type ITelemetryClient,
  TelemetryEventTypes,
  type InventoryAddDataParams,
  type EntityInventoryViewedParams,
  type SearchQuerySubmittedParams,
  type EntityViewClickedParams,
} from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportInventoryAddData = (params: InventoryAddDataParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.INVENTORY_ADD_DATA_CLICKED, params);
  };

  public reportEntityInventoryViewed = (params: EntityInventoryViewedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_VIEWED, params);
  };

  public reportSearchQuerySbmitted = (params: SearchQuerySubmittedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.SEARCH_QUERY_SUBMITTED, params);
  };
  public reportEntityViewClicked = (params: EntityViewClickedParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_VIEW_CLICKED, params);
  };
}
