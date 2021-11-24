/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsResponse } from '../../../../common';
import { MetricsHandler } from './types';

export class AlertDetails implements MetricsHandler {
  /**
   * This boolean protects against the metrics being queried multiple times. The applyMetrics function could be called
   * once for each feature. All the metrics will be retrieved when the first applyMetrics is called though.
   */
  private retrievedMetrics: boolean = false;

  public getFeatures(): Set<string> {
    return new Set(['alertHosts', 'alertUsers']);
  }

  public async applyMetrics(results: MetricsResponse): Promise<MetricsResponse> {
    // we already retrieved the metrics so just return them as they are
    if (this.retrievedMetrics) {
      return results;
    }

    this.retrievedMetrics = true;

    return {
      ...results,
      alertHosts: { total: 0, values: [] },
      alertUsers: { total: 0, values: [] },
    };
  }
}
