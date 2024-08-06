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
  EntityExperienceStatusParams,
  TelemetryEventTypes,
  EntityInventoryPageStateParams,
  EntityInventoryAddDataParams,
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

  public reportEntityExperienceStatusChange = (params: EntityExperienceStatusParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_EXPERIENCE_STATUS, params);
  };

  public reportEntityInventoryPageState = (params: EntityInventoryPageStateParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_PAGE_STATE, params);
  };

  public reportEntityInventoryAddData = (params: EntityInventoryAddDataParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.ENTITY_INVENTORY_ADD_DATA, params);
  };
}
