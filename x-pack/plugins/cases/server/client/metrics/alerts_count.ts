/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseMetricsResponse } from '../../../common';
import { CasesClient } from '../client';
import { MetricsHandler } from './types';

export class AlertsCount implements MetricsHandler {
  constructor(private readonly caseId: string, private readonly casesClient: CasesClient) {}

  public getFeatures(): Set<string> {
    return new Set(['alertsCount']);
  }

  public async compute(): Promise<CaseMetricsResponse> {
    const { count } = await this.casesClient.attachments.countAlertsAttachedToCase(this.caseId);

    return {
      alerts: {
        count,
      },
    };
  }
}
