/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common';
import { CasesClient } from '../client';
import { CasesClientArgs } from '../types';
import { MetricsHandler } from './types';

export class AlertDetails implements MetricsHandler {
  /**
   * This boolean protects against the metrics being queried multiple times. The applyMetrics function could be called
   * once for each feature. All the metrics will be retrieved when the first applyMetrics is called though.
   */
  private retrievedMetrics: boolean = false;
  private metrics: string[] = [];

  constructor(
    private readonly caseId: string,
    private readonly casesClient: CasesClient,
    private readonly clientArgs: CasesClientArgs
  ) {}

  public getFeatures(): Set<string> {
    return new Set(['alertHosts', 'alertUsers']);
  }

  public setupFeature(feature: string) {
    switch (feature) {
      case 'alertHosts':
        this.metrics.push('hosts');
        break;
      case 'alertUsers':
        this.metrics.push('users');
        break;
    }
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const alerts = await this.casesClient.attachments.getAllAlertsAttachToCase({
      caseId: this.caseId,
    });

    const { ids, indices } = alerts.reduce<{ ids: string[]; indices: string[] }>(
      (acc, alert) => {
        acc.ids.push(alert.id);
        acc.indices.push(alert.index);
        return acc;
      },
      { ids: [], indices: [] }
    );

    // this.clientArgs.alertsService.aggregateFields({fields: this.metrics, ids, indices})

    // we already retrieved the metrics so just return them as they are
    if (this.retrievedMetrics) {
      return {};
    }

    this.retrievedMetrics = true;

    return {
      alerts: {
        hosts: { total: 0, values: [] },
        users: { total: 0, values: [] },
      },
    };
  }
}
