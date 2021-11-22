/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsResponse } from '../../../../common';
import { CasesClient } from '../../client';
import { MetricsHandler } from './types';

export class Lifespan implements MetricsHandler {
  constructor(private readonly caseId: string, private readonly casesClient: CasesClient) {}

  public async applyMetrics(results: MetricsResponse): Promise<MetricsResponse> {
    const caseInfo = await this.casesClient.cases.get({ id: this.caseId });
    return {
      ...results,
      lifespan: {
        creationDate: caseInfo.created_at,
        closeDate: caseInfo.closed_at,
      },
    };
  }
}
