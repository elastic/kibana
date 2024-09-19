/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import { ITelemetryClient, TelemetryEventTypes, InventoryAddDataParams } from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private analytics: AnalyticsServiceSetup) {}

  public reportInventoryAddData = (params: InventoryAddDataParams) => {
    this.analytics.reportEvent(TelemetryEventTypes.INVENTORY_ADD_DATA_CLICKED, params);
  };
}
